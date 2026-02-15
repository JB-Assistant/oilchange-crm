import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { ensureOrganization } from '@/lib/ensure-org'
import { processImportRow, rowsToCleanedImport } from '@/lib/import/process-rows'

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureOrganization(orgId)

    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      return handleWizardImport(request, orgId)
    }
    return handleLegacyImport(request, orgId)
  } catch (error) {
    console.error('Error importing customers:', error)
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
  const errorMessages: string[] = []

  for (let i = 0; i < cleanedRows.length; i++) {
    try {
      const result = await processImportRow(cleanedRows[i], orgId, body.smsConsent)
      if (result === 'success') success++
      else if (result === 'duplicate') duplicates++
      else {
        errors++
        errorMessages.push(`Row ${i + 1}: ${result}`)
      }
    } catch (err) {
      errors++
      errorMessages.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return NextResponse.json({
    success,
    errors,
    duplicates,
    message: errors > 0
      ? `Imported ${success} customers with ${errors} errors`
      : `Successfully imported ${success} customers`,
    details: errors > 0 ? errorMessages.slice(0, 10) : undefined,
  })
}

async function handleLegacyImport(request: NextRequest, orgId: string) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  const smsConsent = formData.get('smsConsent') === 'true'

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }

  const Papa = await import('papaparse')
  const rawText = await file.text()
  const result = Papa.default.parse<string[]>(rawText, { skipEmptyLines: true })
  const rows = result.data

  if (rows.length < 2) {
    return NextResponse.json({ error: 'CSV file is empty or has no data rows' }, { status: 400 })
  }

  const headers = rows[0].map((h: string) => h.trim().toLowerCase())
  const dataRows = rows.slice(1)

  // Build a simple mapping from header names to values
  const cleanedRows = rowsToCleanedImport(
    dataRows.map(row => {
      const cells: Record<string, { value: string }> = {}
      const get = (col: string) => {
        const idx = headers.indexOf(col)
        return idx >= 0 ? (row[idx]?.trim() ?? '') : ''
      }

      // Detect format
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
  const errorMessages: string[] = []

  for (let i = 0; i < cleanedRows.length; i++) {
    try {
      const res = await processImportRow(cleanedRows[i], orgId, smsConsent)
      if (res === 'success') success++
      else if (res === 'duplicate') duplicates++
      else {
        errors++
        errorMessages.push(`Row ${i + 1}: ${res}`)
      }
    } catch (err) {
      errors++
      errorMessages.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const format = headers.includes('full name') || headers.includes('year/make/model') ? 'shop' : 'standard'

  return NextResponse.json({
    success,
    errors,
    duplicates,
    format,
    message: errors > 0
      ? `Imported ${success} customers with ${errors} errors`
      : `Successfully imported ${success} customers`,
    details: errors > 0 ? errorMessages.slice(0, 10) : undefined,
  })
}
