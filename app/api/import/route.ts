import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CustomerStatus, Prisma } from '@prisma/client'
import { calculateNextDueDate, calculateNextDueMileage } from '@/lib/customer-status'

type CSVFormat = 'standard' | 'shop'

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const smsConsent = formData.get('smsConsent') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty or has no data rows' }, { status: 400 })
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const format = detectCSVFormat(headers)

    let success = 0
    let errors = 0
    let duplicates = 0
    const errorMessages: string[] = []

    for (let i = 1; i < lines.length; i++) {
      try {
        const row = parseCSVLine(lines[i])
        const result = format === 'shop'
          ? await processShopRow(row, headers, orgId, smsConsent)
          : await processStandardRow(row, headers, orgId, smsConsent)

        if (result === 'success') success++
        else if (result === 'duplicate') duplicates++
        else {
          errors++
          errorMessages.push(`Row ${i}: ${result}`)
        }
      } catch (err) {
        errors++
        errorMessages.push(`Row ${i}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

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
  } catch (error) {
    console.error('Error importing customers:', error)
    return NextResponse.json({ error: 'Failed to import customers' }, { status: 500 })
  }
}

function detectCSVFormat(headers: string[]): CSVFormat {
  const shopIndicators = ['full name', 'vin code', 'year/make/model']
  const hasShopHeaders = shopIndicators.some(h => headers.includes(h))
  return hasShopHeaders ? 'shop' : 'standard'
}

function parseFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim()
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

function parseYearMakeModel(combined: string): { year: number; make: string; model: string } | null {
  const trimmed = combined.trim()
  if (!trimmed) return null

  const parts = trimmed.split(/\s+/)
  const year = parseInt(parts[0])
  if (isNaN(year) || year < 1900 || year > 2100) return null
  if (parts.length < 3) return null

  return { year, make: parts[1], model: parts.slice(2).join(' ') }
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1)
  return digits
}

function inferServiceType(description: string): string {
  const lower = description.toLowerCase()
  if (lower.includes('oil change') || lower.includes('oil filter') || lower.includes('5w')) {
    return 'oil_change'
  }
  if (lower.includes('tire rotation') || lower.includes('rotate')) return 'tire_rotation'
  if (lower.includes('inspection')) return 'state_inspection'
  if (lower.includes('brake')) return 'brake_service'
  if (lower.includes('transmission')) return 'transmission'
  return 'oil_change'
}

function getColValue(row: string[], headers: string[], colName: string): string {
  const idx = headers.indexOf(colName)
  return idx >= 0 ? (row[idx]?.trim() ?? '') : ''
}

async function processShopRow(
  row: string[],
  headers: string[],
  orgId: string,
  smsConsent: boolean
): Promise<'success' | 'duplicate' | string> {
  const rawPhone = getColValue(row, headers, 'phone')
  if (!rawPhone) return 'Missing phone number'

  const phone = normalizePhone(rawPhone)
  if (phone.length < 10) return 'Invalid phone number'

  const existing = await prisma.customer.findFirst({
    where: { orgId, phone },
  })
  if (existing) return 'duplicate'

  const fullNameRaw = getColValue(row, headers, 'full name')
  const { firstName, lastName } = fullNameRaw
    ? parseFullName(fullNameRaw)
    : { firstName: 'Unknown', lastName: '' }

  const email = getColValue(row, headers, 'email') || null
  const ymm = getColValue(row, headers, 'year/make/model')
  const vin = getColValue(row, headers, 'vin code') || null
  const mileageStr = getColValue(row, headers, 'current milleage') || getColValue(row, headers, 'current mileage')
  const mileage = mileageStr ? parseInt(mileageStr.replace(/\D/g, '')) : null
  const repairDesc = getColValue(row, headers, 'repair description') || null

  const vehicleInfo = ymm ? parseYearMakeModel(ymm) : null
  const serviceType = repairDesc ? inferServiceType(repairDesc) : 'oil_change'
  const serviceDate = new Date()

  const customerData: Prisma.CustomerUncheckedCreateInput = {
    firstName,
    lastName,
    phone,
    email,
    status: CustomerStatus.up_to_date,
    orgId,
    smsConsent,
    smsConsentDate: smsConsent ? new Date() : null,
  }

  if (vehicleInfo) {
    customerData.vehicles = {
      create: [{
        year: vehicleInfo.year,
        make: vehicleInfo.make,
        model: vehicleInfo.model,
        vin,
        licensePlate: null,
        mileageAtLastService: mileage || null,
        serviceRecords: mileage ? {
          create: [{
            serviceDate,
            mileageAtService: mileage,
            serviceType,
            notes: repairDesc,
            nextDueDate: calculateNextDueDate(serviceDate),
            nextDueMileage: calculateNextDueMileage(mileage),
          }],
        } : undefined,
      }],
    }
  }

  await prisma.customer.create({ data: customerData })

  if (smsConsent) {
    const customer = await prisma.customer.findFirst({
      where: { orgId, phone },
      select: { id: true },
    })
    if (customer) {
      await prisma.consentLog.create({
        data: {
          orgId,
          customerId: customer.id,
          action: 'opt_in',
          source: 'csv_import',
          performedBy: 'system',
          notes: 'Consent granted during CSV import',
        },
      })
    }
  }

  return 'success'
}

async function processStandardRow(
  row: string[],
  headers: string[],
  orgId: string,
  smsConsent: boolean
): Promise<'success' | 'duplicate' | string> {
  const colIndex = {
    firstName: headers.indexOf('firstname'),
    lastName: headers.indexOf('lastname'),
    phone: headers.indexOf('phone'),
    email: headers.indexOf('email'),
    vehicleYear: headers.indexOf('vehicleyear'),
    vehicleMake: headers.indexOf('vehiclemake'),
    vehicleModel: headers.indexOf('vehiclemodel'),
    licensePlate: headers.indexOf('licenseplate'),
    lastServiceDate: headers.indexOf('lastservicedate'),
    lastServiceMileage: headers.indexOf('lastservicemileage'),
  }

  const firstName = row[colIndex.firstName]?.trim()
  const lastName = row[colIndex.lastName]?.trim()
  const rawPhone = row[colIndex.phone]?.trim()
  const email = row[colIndex.email]?.trim() || null

  if (!firstName || !lastName || !rawPhone) return 'Missing required fields'

  const phone = normalizePhone(rawPhone)
  if (phone.length < 10) return 'Invalid phone number'

  const existing = await prisma.customer.findFirst({
    where: { orgId, phone },
  })
  if (existing) return 'duplicate'

  const vehicleYear = colIndex.vehicleYear >= 0 ? parseInt(row[colIndex.vehicleYear]) : null
  const vehicleMake = colIndex.vehicleMake >= 0 ? row[colIndex.vehicleMake]?.trim() : null
  const vehicleModel = colIndex.vehicleModel >= 0 ? row[colIndex.vehicleModel]?.trim() : null
  const licensePlate = colIndex.licensePlate >= 0 ? row[colIndex.licensePlate]?.trim() : null
  const lastServiceDate = colIndex.lastServiceDate >= 0 ? row[colIndex.lastServiceDate]?.trim() : null
  const lastServiceMileage = colIndex.lastServiceMileage >= 0 ? parseInt(row[colIndex.lastServiceMileage]) : null

  const customerData: Prisma.CustomerUncheckedCreateInput = {
    firstName,
    lastName,
    phone,
    email,
    status: CustomerStatus.up_to_date,
    orgId,
    smsConsent,
    smsConsentDate: smsConsent ? new Date() : null,
  }

  if (vehicleYear && vehicleMake && vehicleModel) {
    customerData.vehicles = {
      create: [{
        year: vehicleYear,
        make: vehicleMake,
        model: vehicleModel,
        licensePlate: licensePlate || null,
        mileageAtLastService: lastServiceMileage || null,
        serviceRecords: lastServiceDate && lastServiceMileage ? {
          create: [{
            serviceDate: new Date(lastServiceDate),
            mileageAtService: lastServiceMileage,
            serviceType: 'oil_change',
            nextDueDate: calculateNextDueDate(new Date(lastServiceDate)),
            nextDueMileage: calculateNextDueMileage(lastServiceMileage),
          }],
        } : undefined,
      }],
    }
  }

  await prisma.customer.create({ data: customerData })

  if (smsConsent) {
    const customer = await prisma.customer.findFirst({
      where: { orgId, phone },
      select: { id: true },
    })
    if (customer) {
      await prisma.consentLog.create({
        data: {
          orgId,
          customerId: customer.id,
          action: 'opt_in',
          source: 'csv_import',
          performedBy: 'system',
          notes: 'Consent granted during CSV import',
        },
      })
    }
  }

  return 'success'
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}
