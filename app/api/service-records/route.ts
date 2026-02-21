import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { CustomerStatus } from '@/lib/db/enums'
import { calculateNextDueDate, calculateNextDueMileage, getStatusFromDueDate } from '@/lib/customer-status'
import { createServiceRecordSchema } from '@/lib/validations'
import { assertSupabaseError } from '@/lib/supabase/otto'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'
import { ZodError } from 'zod'

interface VehicleRow {
  id: string
  customer_id: string
  mileage_at_last_service: number | null
}

interface RepairOrderRow {
  id: string
  vehicle_id: string
  service_date: string
  next_due_date: string
  next_due_mileage: number
}

export async function GET(request: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get('vehicleId')

    const customersRes = await db.from('customers').select('id').eq('org_id', orgId)
    assertSupabaseError(customersRes.error, 'Failed to fetch customers for service records')

    const customerIds = (customersRes.data ?? []).map(row => row.id as string)
    if (customerIds.length === 0) return NextResponse.json([])

    let vehiclesQuery = db
      .from('vehicles')
      .select('id, customer_id, year, make, model')
      .in('customer_id', customerIds)

    if (vehicleId) vehiclesQuery = vehiclesQuery.eq('id', vehicleId)

    const vehiclesRes = await vehiclesQuery
    assertSupabaseError(vehiclesRes.error, 'Failed to fetch vehicles for service records')
    const vehicles = vehiclesRes.data ?? []
    const vehicleIds = vehicles.map(v => v.id as string)
    if (vehicleIds.length === 0) return NextResponse.json([])

    const serviceRes = await db
      .from('repair_orders')
      .select('*')
      .in('vehicle_id', vehicleIds)
      .order('service_date', { ascending: false })
    assertSupabaseError(serviceRes.error, 'Failed to fetch service records')

    const customerRes = await db.from('customers').select('*').in('id', customerIds)
    assertSupabaseError(customerRes.error, 'Failed to fetch customers for service records payload')

    const vehicleById = new Map(vehicles.map(v => [v.id as string, v]))
    const customerById = new Map((customerRes.data ?? []).map(c => [c.id as string, c]))
    const hydratedRecords = (serviceRes.data ?? []).flatMap(record => {
      const vehicle = vehicleById.get(record.vehicle_id as string)
      if (!vehicle) return []
      const customer = customerById.get(vehicle.customer_id as string)
      if (!customer) return []
      return [{ ...record, vehicle: { ...vehicle, customer } }]
    })

    return NextResponse.json(hydratedRecords)
  } catch (error) {
    console.error('[service-records] GET:', error)
    return NextResponse.json({ error: 'Failed to fetch service records' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const body = await request.json()
    const data = createServiceRecordSchema.parse(body)
    const { vehicleId, serviceDate, mileageAtService, serviceType, notes } = data

    const vehicleRes = await db
      .from('vehicles')
      .select('id, customer_id, mileage_at_last_service')
      .eq('id', vehicleId)
      .maybeSingle()
    assertSupabaseError(vehicleRes.error, 'Failed to fetch vehicle for service record')

    const vehicle = vehicleRes.data as VehicleRow | null
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })

    const customerRes = await db
      .from('customers')
      .select('id, org_id')
      .eq('id', vehicle.customer_id)
      .maybeSingle()
    assertSupabaseError(customerRes.error, 'Failed to verify service record customer org')

    const customer = customerRes.data
    if (!customer || customer.org_id !== orgId) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    const serviceTypeDefRes = await db
      .from('service_types')
      .select('default_time_interval_days, default_mileage_interval')
      .eq('org_id', orgId)
      .eq('name', serviceType || 'oil_change_standard')
      .maybeSingle()
    assertSupabaseError(serviceTypeDefRes.error, 'Failed to fetch service type defaults')

    const serviceTypeDef = serviceTypeDefRes.data
    const serviceDateObj = new Date(serviceDate)
    const nextDueDate = calculateNextDueDate(serviceDateObj, serviceTypeDef?.default_time_interval_days)
    const nextDueMileage = calculateNextDueMileage(mileageAtService, serviceTypeDef?.default_mileage_interval)
    const now = new Date().toISOString()

    const insertRes = await db
      .from('repair_orders')
      .insert({
        id: crypto.randomUUID(),
        org_id: orgId,
        vehicle_id: vehicleId,
        service_date: serviceDateObj.toISOString(),
        mileage_at_service: mileageAtService,
        service_type: serviceType || 'oil_change',
        notes: notes || null,
        next_due_date: nextDueDate.toISOString(),
        next_due_mileage: nextDueMileage,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single()
    assertSupabaseError(insertRes.error, 'Failed to create service record')

    await db.from('vehicles').update({ mileage_at_last_service: mileageAtService, updated_at: now }).eq('id', vehicleId)
    await updateCustomerStatus(customer.id, orgId)
    return NextResponse.json(insertRes.data, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    console.error('[service-records] POST:', error)
    return NextResponse.json({ error: 'Failed to create service record' }, { status: 500 })
  }
}

async function updateCustomerStatus(customerId: string, orgId: string) {
  const db = await createProductAdminClient()
  const vehiclesRes = await db
    .from('vehicles')
    .select('id, customer_id, mileage_at_last_service')
    .eq('customer_id', customerId)
  assertSupabaseError(vehiclesRes.error, 'Failed to fetch vehicles for customer status update')

  const vehicles = (vehiclesRes.data ?? []) as VehicleRow[]
  const vehicleIds = vehicles.map(v => v.id)
  let repairOrders: RepairOrderRow[] = []

  if (vehicleIds.length > 0) {
    const ordersRes = await db
      .from('repair_orders')
      .select('id, vehicle_id, service_date, next_due_date, next_due_mileage')
      .in('vehicle_id', vehicleIds)
      .order('service_date', { ascending: false })
    assertSupabaseError(ordersRes.error, 'Failed to fetch services for customer status update')
    repairOrders = (ordersRes.data ?? []) as RepairOrderRow[]
  }

  const latestByVehicle = new Map<string, RepairOrderRow>()
  for (const record of repairOrders) {
    if (!latestByVehicle.has(record.vehicle_id)) latestByVehicle.set(record.vehicle_id, record)
  }

  let mostUrgentStatus: CustomerStatus = CustomerStatus.up_to_date
  for (const vehicle of vehicles) {
    const latestService = latestByVehicle.get(vehicle.id)
    if (!latestService) continue

    const status = getStatusFromDueDate(
      new Date(latestService.next_due_date),
      latestService.next_due_mileage,
      vehicle.mileage_at_last_service || 0
    )

    if (status === CustomerStatus.overdue) { mostUrgentStatus = CustomerStatus.overdue; break }
    if (status === CustomerStatus.due_now) { mostUrgentStatus = CustomerStatus.due_now; continue }
    if (status === CustomerStatus.due_soon && mostUrgentStatus === CustomerStatus.up_to_date) {
      mostUrgentStatus = CustomerStatus.due_soon
    }
  }

  await db.from('customers').update({ status: mostUrgentStatus, updated_at: new Date().toISOString() }).eq('id', customerId).eq('org_id', orgId)
}

export async function DELETE(request: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'Service record ID required' }, { status: 400 })

    const recordRes = await db.from('repair_orders').select('id, vehicle_id').eq('id', id).maybeSingle()
    assertSupabaseError(recordRes.error, 'Failed to fetch service record for delete')

    if (!recordRes.data) return NextResponse.json({ error: 'Service record not found' }, { status: 404 })

    const vehicleRes = await db.from('vehicles').select('id, customer_id').eq('id', recordRes.data.vehicle_id as string).maybeSingle()
    assertSupabaseError(vehicleRes.error, 'Failed to verify service record ownership')

    if (!vehicleRes.data) return NextResponse.json({ error: 'Service record not found' }, { status: 404 })

    const customerRes = await db.from('customers').select('id').eq('id', vehicleRes.data.customer_id as string).eq('org_id', orgId).maybeSingle()
    assertSupabaseError(customerRes.error, 'Failed to verify service record customer ownership')

    if (!customerRes.data) return NextResponse.json({ error: 'Service record not found' }, { status: 404 })

    const deleteRes = await db.from('repair_orders').delete().eq('id', id)
    assertSupabaseError(deleteRes.error, 'Failed to delete service record')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[service-records] DELETE:', error)
    return NextResponse.json({ error: 'Failed to delete service record' }, { status: 500 })
  }
}
