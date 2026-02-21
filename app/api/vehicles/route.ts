import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createVehicleSchema } from '@/lib/validations'
import { assertSupabaseError } from '@/lib/supabase/otto'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'
import { ZodError } from 'zod'

interface VehicleRow {
  id: string
  customer_id: string
  year: number
  make: string
  model: string
  created_at: string
}

interface CustomerRow {
  id: string
  first_name: string
  last_name: string
  phone: string
}

interface ServiceRow {
  id: string
  vehicle_id: string
  service_date: string
}

export async function GET(request: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    let customersQuery = db
      .from('customers')
      .select('id, first_name, last_name, phone')
      .eq('org_id', orgId)

    if (customerId) customersQuery = customersQuery.eq('id', customerId)

    const customersRes = await customersQuery
    assertSupabaseError(customersRes.error, 'Failed to fetch customers for vehicles')
    const customers = (customersRes.data ?? []) as CustomerRow[]
    const customerIds = customers.map(c => c.id)

    if (customerIds.length === 0) return NextResponse.json([])

    const vehiclesRes = await db
      .from('vehicles')
      .select('*')
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false })
    assertSupabaseError(vehiclesRes.error, 'Failed to fetch vehicles')
    const vehicles = (vehiclesRes.data ?? []) as VehicleRow[]
    const vehicleIds = vehicles.map(v => v.id)

    const latestServiceByVehicle = new Map<string, ServiceRow>()
    if (vehicleIds.length > 0) {
      const servicesRes = await db
        .from('repair_orders')
        .select('id, vehicle_id, service_date')
        .in('vehicle_id', vehicleIds)
        .order('service_date', { ascending: false })
      assertSupabaseError(servicesRes.error, 'Failed to fetch vehicle service records')

      for (const row of (servicesRes.data ?? []) as ServiceRow[]) {
        if (!latestServiceByVehicle.has(row.vehicle_id)) {
          latestServiceByVehicle.set(row.vehicle_id, row)
        }
      }
    }

    const customerById = new Map(customers.map(c => [c.id, c]))
    const hydratedVehicles = vehicles.map(vehicle => ({
      ...vehicle,
      customer: customerById.get(vehicle.customer_id) ?? null,
      serviceRecords: latestServiceByVehicle.has(vehicle.id) ? [latestServiceByVehicle.get(vehicle.id)] : [],
    }))

    return NextResponse.json(hydratedVehicles)
  } catch (error) {
    console.error('[vehicles] GET:', error)
    return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const body = await request.json()
    const data = createVehicleSchema.parse(body)

    const customerRes = await db
      .from('customers')
      .select('id')
      .eq('id', data.customerId)
      .eq('org_id', orgId)
      .maybeSingle()
    assertSupabaseError(customerRes.error, 'Failed to verify vehicle customer')

    if (!customerRes.data) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const now = new Date().toISOString()
    const vehicleRes = await db
      .from('vehicles')
      .insert({
        id: crypto.randomUUID(),
        org_id: orgId,
        customer_id: data.customerId,
        year: data.year,
        make: data.make,
        model: data.model,
        license_plate: data.licensePlate || null,
        vin: data.vin || null,
        mileage_at_last_service: null,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single()
    assertSupabaseError(vehicleRes.error, 'Failed to create vehicle')

    return NextResponse.json(vehicleRes.data, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    console.error('[vehicles] POST:', error)
    return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'Vehicle ID required' }, { status: 400 })

    const vehicleRes = await db
      .from('vehicles')
      .select('id, customer_id')
      .eq('id', id)
      .maybeSingle()
    assertSupabaseError(vehicleRes.error, 'Failed to fetch vehicle for delete')

    if (!vehicleRes.data) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })

    const customerRes = await db
      .from('customers')
      .select('id')
      .eq('id', vehicleRes.data.customer_id as string)
      .eq('org_id', orgId)
      .maybeSingle()
    assertSupabaseError(customerRes.error, 'Failed to verify vehicle ownership')

    if (!customerRes.data) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })

    const deleteRes = await db.from('vehicles').delete().eq('id', id)
    assertSupabaseError(deleteRes.error, 'Failed to delete vehicle')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[vehicles] DELETE:', error)
    return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 })
  }
}
