import { prisma } from '@/lib/prisma'
import { CustomerStatus, Prisma } from '@prisma/client'
import { calculateNextDueDate, calculateNextDueMileage } from '@/lib/customer-status'
import { inferServiceType } from './data-cleaners'

export interface ImportRowResult {
  status: 'success' | 'duplicate' | 'updated' | 'error'
  message: string
  created: { customer: boolean; vehicle: boolean; serviceRecord: boolean }
}

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
): Promise<ImportRowResult> {
  const noCreation = { customer: false, vehicle: false, serviceRecord: false }

  if (!row.phone || row.phone.length < 10) {
    return { status: 'error', message: 'Invalid phone number', created: noCreation }
  }
  if (!row.firstName) {
    return { status: 'error', message: 'Missing first name', created: noCreation }
  }

  const mileage = row.lastServiceMileage ? parseInt(row.lastServiceMileage) : null
  const rawDate = row.lastServiceDate ? new Date(row.lastServiceDate) : null
  const validDate = rawDate && !isNaN(rawDate.getTime()) ? rawDate : null
  // Default to today when we have mileage or repair data but no explicit date
  const serviceDate = validDate ?? ((mileage || row.repairDescription) ? new Date() : null)
  const serviceType = row.repairDescription ? inferServiceType(row.repairDescription) : 'oil_change'
  const hasVehicle = !!(row.vehicleYear && row.vehicleMake && row.vehicleModel)
  const hasService = !!(serviceDate && mileage)

  const existing = await prisma.customer.findFirst({
    where: { orgId, phone: row.phone },
    include: {
      vehicles: {
        select: {
          id: true, year: true, make: true, model: true,
          serviceRecords: { select: { mileageAtService: true } },
        },
      },
    },
  })

  if (existing) {
    if (!hasVehicle) {
      return { status: 'duplicate', message: 'No new data to add', created: noCreation }
    }

    const importYear = parseInt(row.vehicleYear)
    const matchedVehicle = existing.vehicles.find(
      v =>
        v.year === importYear &&
        v.make.toLowerCase() === row.vehicleMake.toLowerCase() &&
        v.model.toLowerCase() === row.vehicleModel.toLowerCase()
    )

    if (matchedVehicle) {
      // Vehicle exists — try to add service record if we have data and it's not already there
      if (hasService) {
        const alreadyHasRecord = matchedVehicle.serviceRecords.some(
          sr => sr.mileageAtService === mileage
        )
        if (!alreadyHasRecord) {
          try {
            await prisma.serviceRecord.create({
              data: {
                vehicleId: matchedVehicle.id,
                serviceDate: serviceDate!,
                mileageAtService: mileage!,
                serviceType,
                notes: row.repairDescription || null,
                nextDueDate: calculateNextDueDate(serviceDate!),
                nextDueMileage: calculateNextDueMileage(mileage!),
              },
            })
            await prisma.vehicle.update({
              where: { id: matchedVehicle.id },
              data: { mileageAtLastService: mileage },
            })
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error'
            return { status: 'error', message: `Failed to add service record: ${msg}`, created: noCreation }
          }
          return {
            status: 'updated',
            message: 'Added service record to existing vehicle',
            created: { customer: false, vehicle: false, serviceRecord: true },
          }
        }
      }
      return { status: 'duplicate', message: 'Vehicle already exists', created: noCreation }
    }

    try {
      await prisma.vehicle.create({
        data: {
          customerId: existing.id,
          year: importYear,
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
        },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      return { status: 'error', message: `Failed to enrich: ${msg}`, created: noCreation }
    }

    return {
      status: 'updated',
      message: 'Enriched existing customer with new vehicle',
      created: { customer: false, vehicle: true, serviceRecord: hasService },
    }
  }

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
    return { status: 'error', message: `Failed to save: ${msg}`, created: noCreation }
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

  return {
    status: 'success',
    message: 'Imported successfully',
    created: {
      customer: true,
      vehicle: hasVehicle,
      serviceRecord: hasVehicle && hasService,
    },
  }
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
