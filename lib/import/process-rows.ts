import { prisma } from '@/lib/prisma'
import { CustomerStatus, Prisma } from '@prisma/client'
import { calculateNextDueDate, calculateNextDueMileage } from '@/lib/customer-status'
import { inferServiceType } from './data-cleaners'

interface CleanedImportRow {
  firstName: string
  lastName: string
  phone: string
  email: string
  vehicleYear: string
  vehicleMake: string
  vehicleModel: string
  vin: string
  licensePlate: string
  lastServiceDate: string
  lastServiceMileage: string
  repairDescription: string
}

export async function processImportRow(
  row: CleanedImportRow,
  orgId: string,
  smsConsent: boolean
): Promise<'success' | 'duplicate' | string> {
  if (!row.phone || row.phone.length < 10) {
    return 'Invalid phone number'
  }
  if (!row.firstName) {
    return 'Missing first name'
  }

  const existing = await prisma.customer.findFirst({
    where: { orgId, phone: row.phone },
  })
  if (existing) return 'duplicate'

  const mileage = row.lastServiceMileage ? parseInt(row.lastServiceMileage) : null
  const serviceDate = row.lastServiceDate ? new Date(row.lastServiceDate) : null
  const serviceType = row.repairDescription ? inferServiceType(row.repairDescription) : 'oil_change'
  const hasVehicle = !!(row.vehicleYear && row.vehicleMake && row.vehicleModel)

  const customerData: Prisma.CustomerUncheckedCreateInput = {
    firstName: row.firstName,
    lastName: row.lastName || '',
    phone: row.phone,
    email: row.email || null,
    status: CustomerStatus.up_to_date,
    orgId,
    smsConsent,
    smsConsentDate: smsConsent ? new Date() : null,
  }

  if (hasVehicle) {
    const year = parseInt(row.vehicleYear)
    const hasService = !!(serviceDate && mileage && !isNaN(serviceDate.getTime()))

    customerData.vehicles = {
      create: [{
        year,
        make: row.vehicleMake,
        model: row.vehicleModel,
        vin: row.vin || null,
        licensePlate: row.licensePlate || null,
        mileageAtLastService: mileage || null,
        serviceRecords: hasService ? {
          create: [{
            serviceDate: serviceDate!,
            mileageAtService: mileage!,
            serviceType,
            notes: row.repairDescription || null,
            nextDueDate: calculateNextDueDate(serviceDate!),
            nextDueMileage: calculateNextDueMileage(mileage!),
          }],
        } : undefined,
      }],
    }
  }

  try {
    await prisma.customer.create({ data: customerData })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return `Failed to save: ${msg}`
  }

  if (smsConsent) {
    const customer = await prisma.customer.findFirst({
      where: { orgId, phone: row.phone },
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

export function rowsToCleanedImport(
  rows: Array<{ cells: Record<string, { value: string }> }>
): CleanedImportRow[] {
  return rows.map(row => ({
    firstName: row.cells.firstName?.value ?? '',
    lastName: row.cells.lastName?.value ?? '',
    phone: row.cells.phone?.value ?? '',
    email: row.cells.email?.value ?? '',
    vehicleYear: row.cells.vehicleYear?.value ?? '',
    vehicleMake: row.cells.vehicleMake?.value ?? '',
    vehicleModel: row.cells.vehicleModel?.value ?? '',
    vin: row.cells.vin?.value ?? '',
    licensePlate: row.cells.licensePlate?.value ?? '',
    lastServiceDate: row.cells.lastServiceDate?.value ?? '',
    lastServiceMileage: row.cells.lastServiceMileage?.value ?? '',
    repairDescription: row.cells.repairDescription?.value ?? '',
  }))
}
