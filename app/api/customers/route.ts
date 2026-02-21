import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { type CustomerStatus, CustomerStatus as CustomerStatusValues } from '@/lib/db/enums'
import { createCustomerSchema, updateCustomerSchema } from '@/lib/validations'
import { assertSupabaseError, buildSearchPattern, getOttoClient } from '@/lib/supabase/otto'
import { ZodError } from 'zod'

interface CustomerRow {
  id: string
  firstName: string
  lastName: string
  phone: string
  status: string
  createdAt: string
}

interface VehicleRow {
  id: string
  customerId: string
}

interface ServiceRow {
  vehicleId: string
  nextDueDate: string
  nextDueMileage: number
  serviceDate: string
}

function isCustomerStatus(value: string | null): value is CustomerStatus {
  if (!value) return false
  return Object.values(CustomerStatusValues).includes(value as CustomerStatus)
}

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getOttoClient()
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const search = searchParams.get('search')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)))

    let query = db
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('orgId', orgId)
      .order('createdAt', { ascending: false })

    if (isCustomerStatus(statusParam)) {
      query = query.eq('status', statusParam)
    }

    if (search) {
      const pattern = buildSearchPattern(search)
      query = query.or(
        `firstName.ilike.${pattern},lastName.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`
      )
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    const { data: customerRows, count, error: customersError } = await query.range(from, to)
    assertSupabaseError(customersError, 'Failed to fetch customers')

    const customers = (customerRows ?? []) as CustomerRow[]
    const customerIds = customers.map((customer) => customer.id)

    let vehicles: VehicleRow[] = []
    let serviceRecords: ServiceRow[] = []

    if (customerIds.length > 0) {
      const vehiclesRes = await db
        .from('vehicles')
        .select('id, customerId')
        .in('customerId', customerIds)
      assertSupabaseError(vehiclesRes.error, 'Failed to fetch customer vehicles')
      vehicles = (vehiclesRes.data ?? []) as VehicleRow[]

      const vehicleIds = vehicles.map((vehicle) => vehicle.id)
      if (vehicleIds.length > 0) {
        const servicesRes = await db
          .from('service_records')
          .select('vehicleId, nextDueDate, nextDueMileage, serviceDate')
          .in('vehicleId', vehicleIds)
          .order('serviceDate', { ascending: false })
        assertSupabaseError(servicesRes.error, 'Failed to fetch service records')
        serviceRecords = (servicesRes.data ?? []) as ServiceRow[]
      }
    }

    const latestServiceByVehicle = new Map<string, ServiceRow>()
    for (const record of serviceRecords) {
      if (!latestServiceByVehicle.has(record.vehicleId)) {
        latestServiceByVehicle.set(record.vehicleId, record)
      }
    }

    const vehiclesByCustomer = new Map<string, Array<VehicleRow & {
      serviceRecords: Array<{ nextDueDate: string; nextDueMileage: number }>
    }>>()

    for (const vehicle of vehicles) {
      const latestService = latestServiceByVehicle.get(vehicle.id)
      const hydratedVehicle = {
        ...vehicle,
        serviceRecords: latestService ? [{
          nextDueDate: latestService.nextDueDate,
          nextDueMileage: latestService.nextDueMileage,
        }] : [],
      }

      const existing = vehiclesByCustomer.get(vehicle.customerId)
      if (existing) {
        existing.push(hydratedVehicle)
      } else {
        vehiclesByCustomer.set(vehicle.customerId, [hydratedVehicle])
      }
    }

    const hydratedCustomers = customers.map((customer) => ({
      ...customer,
      vehicles: vehiclesByCustomer.get(customer.id) ?? [],
    }))

    const total = count ?? 0
    return NextResponse.json({ data: hydratedCustomers, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
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
    const data = createCustomerSchema.parse(body)

    const duplicateRes = await db
      .from('customers')
      .select('id')
      .eq('orgId', orgId)
      .eq('phone', data.phone)
      .maybeSingle()
    assertSupabaseError(duplicateRes.error, 'Failed to check duplicate customer phone')

    if (duplicateRes.data) {
      return NextResponse.json(
        { error: 'A customer with this phone number already exists' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const customerId = crypto.randomUUID()
    const customerInsertRes = await db
      .from('customers')
      .insert({
        id: customerId,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email || null,
        status: CustomerStatusValues.up_to_date,
        orgId,
        tags: [],
        createdAt: now,
        updatedAt: now,
      })
      .select('*')
      .single()

    assertSupabaseError(customerInsertRes.error, 'Failed to create customer')
    const customer = customerInsertRes.data

    let vehicles: unknown[] = []
    if (data.vehicles.length > 0) {
      const vehicleRows = data.vehicles.map((vehicle) => ({
        id: crypto.randomUUID(),
        customerId,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        licensePlate: vehicle.licensePlate || null,
        vin: null,
        mileageAtLastService: null,
        createdAt: now,
        updatedAt: now,
      }))

      const vehiclesInsertRes = await db
        .from('vehicles')
        .insert(vehicleRows)
        .select('*')
      assertSupabaseError(vehiclesInsertRes.error, 'Failed to create customer vehicles')
      vehicles = vehiclesInsertRes.data ?? []
    }

    return NextResponse.json({ ...customer, vehicles }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Error creating customer:', error)
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getOttoClient()
    const body = await request.json()
    const { id, ...data } = updateCustomerSchema.parse(body)

    const updatePayload = {
      ...data,
      updatedAt: new Date().toISOString(),
    }

    const { data: updatedRows, error } = await db
      .from('customers')
      .update(updatePayload)
      .eq('id', id)
      .eq('orgId', orgId)
      .select('id')

    assertSupabaseError(error, 'Failed to update customer')

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Error updating customer:', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
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
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 })
    }

    const { error } = await db
      .from('customers')
      .delete()
      .eq('id', id)
      .eq('orgId', orgId)
    assertSupabaseError(error, 'Failed to delete customer')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}
