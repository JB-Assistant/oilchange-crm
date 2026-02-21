import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createVehicleSchema } from '@/lib/validations'
import { assertSupabaseError, getOttoClient } from '@/lib/supabase/otto'
import { ZodError } from 'zod'

interface VehicleRow {
  id: string
  customerId: string
  year: number
  make: string
  model: string
  createdAt: string
}

interface CustomerRow {
  id: string
  firstName: string
  lastName: string
  phone: string
}

interface ServiceRow {
  id: string
  vehicleId: string
  serviceDate: string
}

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getOttoClient()
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    let customersQuery = db
      .from('customers')
      .select('id, firstName, lastName, phone')
      .eq('orgId', orgId)

    if (customerId) {
      customersQuery = customersQuery.eq('id', customerId)
    }

    const customersRes = await customersQuery
    assertSupabaseError(customersRes.error, 'Failed to fetch customers for vehicles')
    const customers = (customersRes.data ?? []) as CustomerRow[]
    const customerIds = customers.map((customer) => customer.id)

    if (customerIds.length === 0) {
      return NextResponse.json([])
    }

    const vehiclesRes = await db
      .from('vehicles')
      .select('*')
      .in('customerId', customerIds)
      .order('createdAt', { ascending: false })

    assertSupabaseError(vehiclesRes.error, 'Failed to fetch vehicles')
    const vehicles = (vehiclesRes.data ?? []) as VehicleRow[]
    const vehicleIds = vehicles.map((vehicle) => vehicle.id)

    const latestServiceByVehicle = new Map<string, ServiceRow>()
    if (vehicleIds.length > 0) {
      const servicesRes = await db
        .from('service_records')
        .select('id, vehicleId, serviceDate')
        .in('vehicleId', vehicleIds)
        .order('serviceDate', { ascending: false })
      assertSupabaseError(servicesRes.error, 'Failed to fetch vehicle service records')

      for (const row of (servicesRes.data ?? []) as ServiceRow[]) {
        if (!latestServiceByVehicle.has(row.vehicleId)) {
          latestServiceByVehicle.set(row.vehicleId, row)
        }
      }
    }

    const customerById = new Map(customers.map((customer) => [customer.id, customer]))
    const hydratedVehicles = vehicles.map((vehicle) => ({
      ...vehicle,
      customer: customerById.get(vehicle.customerId) ?? null,
      serviceRecords: latestServiceByVehicle.has(vehicle.id) ? [latestServiceByVehicle.get(vehicle.id)] : [],
    }))

    return NextResponse.json(hydratedVehicles)
  } catch (error) {
    console.error('Error fetching vehicles:', error)
    return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getOttoClient()
    const body = await request.json()
    const data = createVehicleSchema.parse(body)

    const customerRes = await db
      .from('customers')
      .select('id')
      .eq('id', data.customerId)
      .eq('orgId', orgId)
      .maybeSingle()
    assertSupabaseError(customerRes.error, 'Failed to verify vehicle customer')

    if (!customerRes.data) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const vehicleRes = await db
      .from('vehicles')
      .insert({
        id: crypto.randomUUID(),
        customerId: data.customerId,
        year: data.year,
        make: data.make,
        model: data.model,
        licensePlate: data.licensePlate || null,
        vin: data.vin || null,
        mileageAtLastService: null,
        createdAt: now,
        updatedAt: now,
      })
      .select('*')
      .single()

    assertSupabaseError(vehicleRes.error, 'Failed to create vehicle')
    return NextResponse.json(vehicleRes.data, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Error creating vehicle:', error)
    return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getOttoClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Vehicle ID required' }, { status: 400 })
    }

    const vehicleRes = await db
      .from('vehicles')
      .select('id, customerId')
      .eq('id', id)
      .maybeSingle()
    assertSupabaseError(vehicleRes.error, 'Failed to fetch vehicle for delete')

    if (!vehicleRes.data) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    const customerRes = await db
      .from('customers')
      .select('id')
      .eq('id', vehicleRes.data.customerId as string)
      .eq('orgId', orgId)
      .maybeSingle()
    assertSupabaseError(customerRes.error, 'Failed to verify vehicle ownership')

    if (!customerRes.data) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    const deleteRes = await db
      .from('vehicles')
      .delete()
      .eq('id', id)
    assertSupabaseError(deleteRes.error, 'Failed to delete vehicle')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vehicle:', error)
    return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 })
  }
}
