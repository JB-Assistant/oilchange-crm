import { createProductAdminClient } from '@/lib/supabase/server'
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
  const serviceDate = validDate ?? ((mileage || row.repairDescription) ? new Date() : null)
  const serviceType = row.repairDescription ? inferServiceType(row.repairDescription) : 'oil_change'
  const hasVehicle = !!(row.vehicleYear && row.vehicleMake && row.vehicleModel)
  const hasService = !!(serviceDate && mileage)

  const db = await createProductAdminClient()
  const now = new Date().toISOString()

  // Check for existing customer by phone
  const { data: existing } = await db
    .from('customers')
    .select('id')
    .eq('org_id', orgId)
    .eq('phone', row.phone)
    .maybeSingle()

  if (existing) {
    if (!hasVehicle) {
      return { status: 'duplicate', message: 'No new data to add', created: noCreation }
    }

    const importYear = parseInt(row.vehicleYear)

    // Check if vehicle already exists
    const { data: existingVehicles } = await db
      .from('vehicles')
      .select('id, year, make, model')
      .eq('customer_id', existing.id)

    const matchedVehicle = (existingVehicles ?? []).find(
      (v: { id: string; year: number; make: string; model: string }) =>
        v.year === importYear &&
        v.make.toLowerCase() === row.vehicleMake.toLowerCase() &&
        v.model.toLowerCase() === row.vehicleModel.toLowerCase()
    )

    if (matchedVehicle) {
      if (hasService) {
        const { data: existingOrders } = await db
          .from('repair_orders')
          .select('mileage_at_service')
          .eq('vehicle_id', matchedVehicle.id)

        const alreadyHasRecord = (existingOrders ?? []).some(
          (ro: { mileage_at_service: number }) => ro.mileage_at_service === mileage
        )

        if (!alreadyHasRecord) {
          try {
            await db.from('repair_orders').insert({
              vehicle_id: matchedVehicle.id,
              service_date: serviceDate!.toISOString(),
              mileage_at_service: mileage!,
              service_type: serviceType,
              notes: row.repairDescription || null,
              next_due_date: calculateNextDueDate(serviceDate!).toISOString(),
              next_due_mileage: calculateNextDueMileage(mileage!),
              created_at: now,
              updated_at: now,
            })
            await db
              .from('vehicles')
              .update({ mileage_at_last_service: mileage, updated_at: now })
              .eq('id', matchedVehicle.id)
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

    // Add new vehicle to existing customer
    try {
      const { data: newVehicle } = await db
        .from('vehicles')
        .insert({
          customer_id: existing.id,
          year: importYear,
          make: row.vehicleMake,
          model: row.vehicleModel,
          vin: row.vin || null,
          license_plate: row.licensePlate || null,
          mileage_at_last_service: mileage || null,
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single()

      if (newVehicle && hasService) {
        await db.from('repair_orders').insert({
          vehicle_id: newVehicle.id,
          service_date: serviceDate!.toISOString(),
          mileage_at_service: mileage!,
          service_type: serviceType,
          notes: row.repairDescription || null,
          next_due_date: calculateNextDueDate(serviceDate!).toISOString(),
          next_due_mileage: calculateNextDueMileage(mileage!),
          created_at: now,
          updated_at: now,
        })
      }
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

  // Create new customer
  try {
    const { data: newCustomer } = await db
      .from('customers')
      .insert({
        org_id: orgId,
        first_name: row.firstName,
        last_name: row.lastName || '',
        phone: row.phone,
        email: row.email || null,
        status: 'up_to_date',
        sms_consent: smsConsent,
        sms_consent_date: smsConsent ? now : null,
        tags: [],
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single()

    if (!newCustomer) throw new Error('Insert returned no data')

    if (hasVehicle) {
      const year = parseInt(row.vehicleYear)
      const { data: newVehicle } = await db
        .from('vehicles')
        .insert({
          customer_id: newCustomer.id,
          year,
          make: row.vehicleMake,
          model: row.vehicleModel,
          vin: row.vin || null,
          license_plate: row.licensePlate || null,
          mileage_at_last_service: mileage || null,
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single()

      if (newVehicle && hasService) {
        await db.from('repair_orders').insert({
          vehicle_id: newVehicle.id,
          service_date: serviceDate!.toISOString(),
          mileage_at_service: mileage!,
          service_type: serviceType,
          notes: row.repairDescription || null,
          next_due_date: calculateNextDueDate(serviceDate!).toISOString(),
          next_due_mileage: calculateNextDueMileage(mileage!),
          created_at: now,
          updated_at: now,
        })
      }
    }

    if (smsConsent) {
      await db.from('consent_logs').insert({
        org_id: orgId,
        customer_id: newCustomer.id,
        action: 'opt_in',
        source: 'csv_import',
        performed_by: 'system',
        notes: 'Consent granted during CSV import',
      })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { status: 'error', message: `Failed to save: ${msg}`, created: noCreation }
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
