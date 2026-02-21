import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { ensureOrganization } from '@/lib/ensure-org'
import { processImportRow, rowsToCleanedImport } from '@/lib/import/process-rows'

export async function POST(request: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Returns UUID org_id
    const orgId = await ensureOrganization(clerkOrgId)

    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      return handleWizardImport(request, orgId)
    }
    return handleLegacyImport(request, orgId)
  } catch (error) {
    console.error('[import]:', error)
    return NextResponse.json({ error: 'Failed to import customers' }, { status: 500 })
  }
}

async function handleWizardImport(request: NextRequest, orgId: string) {
  const body = await request.json() as {
    rows: Array<{ [key: string]: string }>
    smsConsent: boolean
  }

  if (!body.rows?.length) {
    return NextResponse.json({ error: 'No data to import' }, { status: 400 })
  }

  const cleanedRows = rowsToCleanedImport(
    body.rows.map(r => ({ cells: Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { value: v }])) }))
  )

  let success = 0
  let errors = 0
  let duplicates = 0
  let updated = 0
  let vehiclesCreated = 0
  let serviceRecordsCreated = 0
  const errorMessages: string[] = []
  const warnings: string[] = []

  for (let i = 0; i < cleanedRows.length; i++) {
    try {
      const result = await processImportRow(cleanedRows[i], orgId, body.smsConsent)
      if (result.status === 'success') {
        success++
        if (result.created.vehicle) vehiclesCreated++
        if (result.created.serviceRecord) serviceRecordsCreated++
        if (result.created.vehicle && !result.created.serviceRecord) {
          warnings.push(`Row ${i + 1}: Vehicle created but service record skipped (missing date or mileage)`)
        }
      } else if (result.status === 'updated') {
        updated++
        if (result.created.vehicle) vehiclesCreated++
        if (result.created.serviceRecord) serviceRecordsCreated++
      } else if (result.status === 'duplicate') {
        duplicates++
      } else {
        errors++
        errorMessages.push(`Row ${i + 1}: ${result.message}`)
      }
    } catch (err) {
      errors++
      errorMessages.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const messageParts: string[] = []
  if (success > 0) messageParts.push(`${success} new customers`)
  if (updated > 0) messageParts.push(`enriched ${updated} existing`)
  if (errors > 0) messageParts.push(`${errors} errors`)

  return NextResponse.json({
    success, errors, duplicates, updated, vehiclesCreated, serviceRecordsCreated,
    message: messageParts.length > 0 ? `Imported ${messageParts.join(', ')}` : 'No new data to import',
    details: errors > 0 ? errorMessages.slice(0, 10) : undefined,
    warnings: warnings.length > 0 ? warnings.slice(0, 10) : undefined,
  })
}

async function handleLegacyImport(request: NextRequest, orgId: string) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  const smsConsent = formData.get('smsConsent') === 'true'

  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

  const Papa = await import('papaparse')
  const rawText = await file.text()
  const result = Papa.default.parse<string[]>(rawText, { skipEmptyLines: true })
  const rows = result.data

  if (rows.length < 2) {
    return NextResponse.json({ error: 'CSV file is empty or has no data rows' }, { status: 400 })
  }

  const headers = rows[0].map((h: string) => h.trim().toLowerCase())
  const dataRows = rows.slice(1)

  const cleanedRows = rowsToCleanedImport(
    dataRows.map(row => {
      const cells: Record<string, { value: string }> = {}
      const get = (col: string) => {
        const idx = headers.indexOf(col)
        return idx >= 0 ? (row[idx]?.trim() ?? '') : ''
      }

      const isShop = headers.includes('full name') || headers.includes('year/make/model')

      if (isShop) {
        const fullName = get('full name')
        const parts = fullName.split(/\s+/)
        cells.firstName = { value: parts[0] || '' }
        cells.lastName = { value: parts.slice(1).join(' ') || '' }

        const phone = get('phone').replace(/\D/g, '')
        cells.phone = { value: phone.length === 11 && phone.startsWith('1') ? phone.slice(1) : phone }
        cells.email = { value: get('email') }

        const ymm = get('year/make/model')
        const ymmParts = ymm.split(/\s+/)
        if (ymmParts.length >= 3) {
          cells.vehicleYear = { value: ymmParts[0] }
          cells.vehicleMake = { value: ymmParts[1] }
          cells.vehicleModel = { value: ymmParts.slice(2).join(' ') }
        }

        cells.vin = { value: get('vin code') }
        const mileage = get('current milleage') || get('current mileage')
        cells.lastServiceMileage = { value: mileage.replace(/\D/g, '') }
        cells.repairDescription = { value: get('repair description') }
      } else {
        const phone = get('phone').replace(/\D/g, '')
        cells.firstName = { value: get('firstname') }
        cells.lastName = { value: get('lastname') }
        cells.phone = { value: phone.length === 11 && phone.startsWith('1') ? phone.slice(1) : phone }
        cells.email = { value: get('email') }
        cells.vehicleYear = { value: get('vehicleyear') }
        cells.vehicleMake = { value: get('vehiclemake') }
        cells.vehicleModel = { value: get('vehiclemodel') }
        cells.licensePlate = { value: get('licenseplate') }
        cells.lastServiceDate = { value: get('lastservicedate') }
        cells.lastServiceMileage = { value: get('lastservicemileage') }
      }
      return { cells }
    })
  )

  let success = 0
  let errors = 0
  let duplicates = 0
  let updated = 0
  let vehiclesCreated = 0
  let serviceRecordsCreated = 0
  const errorMessages: string[] = []
  const warnings: string[] = []

  for (let i = 0; i < cleanedRows.length; i++) {
    try {
      const res = await processImportRow(cleanedRows[i], orgId, smsConsent)
      if (res.status === 'success') {
        success++
        if (res.created.vehicle) vehiclesCreated++
        if (res.created.serviceRecord) serviceRecordsCreated++
        if (res.created.vehicle && !res.created.serviceRecord) {
          warnings.push(`Row ${i + 1}: Vehicle created but service record skipped (missing date or mileage)`)
        }
      } else if (res.status === 'updated') {
        updated++
        if (res.created.vehicle) vehiclesCreated++
        if (res.created.serviceRecord) serviceRecordsCreated++
      } else if (res.status === 'duplicate') {
        duplicates++
      } else {
        errors++
        errorMessages.push(`Row ${i + 1}: ${res.message}`)
      }
    } catch (err) {
      errors++
      errorMessages.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const format = headers.includes('full name') || headers.includes('year/make/model') ? 'shop' : 'standard'
  const messageParts: string[] = []
  if (success > 0) messageParts.push(`${success} new customers`)
  if (updated > 0) messageParts.push(`enriched ${updated} existing`)
  if (errors > 0) messageParts.push(`${errors} errors`)

  return NextResponse.json({
    success, errors, duplicates, updated, format, vehiclesCreated, serviceRecordsCreated,
    message: messageParts.length > 0 ? `Imported ${messageParts.join(', ')}` : 'No new data to import',
    details: errors > 0 ? errorMessages.slice(0, 10) : undefined,
    warnings: warnings.length > 0 ? warnings.slice(0, 10) : undefined,
  })
}
