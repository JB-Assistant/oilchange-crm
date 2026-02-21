import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { type CustomerStatus, CustomerStatus as CustomerStatusValues } from '@/lib/db/enums'
import { createCustomerSchema, updateCustomerSchema } from '@/lib/validations'
import { assertSupabaseError, buildSearchPattern } from '@/lib/supabase/otto'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'
import { ZodError } from 'zod'

interface CustomerRow {
  id: string
  first_name: string
  last_name: string
  phone: string
  status: string
  created_at: string
}

interface VehicleRow {
  id: string
  customer_id: string
}

interface ServiceRow {
  vehicle_id: string
  next_due_date: string
  next_due_mileage: number
  service_date: string
}

function isCustomerStatus(value: string | null): value is CustomerStatus {
  if (!value) return false
  return Object.values(CustomerStatusValues).includes(value as CustomerStatus)
}

export async function GET(request: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const search = searchParams.get('search')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)))

    let query = db
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (isCustomerStatus(statusParam)) {
      query = query.eq('status', statusParam)
    }

    if (search) {
      const pattern = buildSearchPattern(search)
      query = query.or(
        `first_name.ilike.${pattern},last_name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`
      )
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    const { data: customerRows, count, error: customersError } = await query.range(from, to)
    assertSupabaseError(customersError, 'Failed to fetch customers')

    const customers = (customerRows ?? []) as CustomerRow[]
    const customerIds = customers.map(c => c.id)

    let vehicles: VehicleRow[] = []
    let serviceRecords: ServiceRow[] = []

    if (customerIds.length > 0) {
      const vehiclesRes = await db
        .from('vehicles')
        .select('id, customer_id')
        .in('customer_id', customerIds)
      assertSupabaseError(vehiclesRes.error, 'Failed to fetch customer vehicles')
      vehicles = (vehiclesRes.data ?? []) as VehicleRow[]

      const vehicleIds = vehicles.map(v => v.id)
      if (vehicleIds.length > 0) {
        const servicesRes = await db
          .from('repair_orders')
          .select('vehicle_id, next_due_date, next_due_mileage, service_date')
          .in('vehicle_id', vehicleIds)
          .order('service_date', { ascending: false })
        assertSupabaseError(servicesRes.error, 'Failed to fetch service records')
        serviceRecords = (servicesRes.data ?? []) as ServiceRow[]
      }
    }

    const latestServiceByVehicle = new Map<string, ServiceRow>()
    for (const record of serviceRecords) {
      if (!latestServiceByVehicle.has(record.vehicle_id)) {
        latestServiceByVehicle.set(record.vehicle_id, record)
      }
    }

    const vehiclesByCustomer = new Map<string, Array<VehicleRow & {
      serviceRecords: Array<{ next_due_date: string; next_due_mileage: number }>
    }>>()

    for (const vehicle of vehicles) {
      const latestService = latestServiceByVehicle.get(vehicle.id)
      const hydratedVehicle = {
        ...vehicle,
        serviceRecords: latestService ? [{ next_due_date: latestService.next_due_date, next_due_mileage: latestService.next_due_mileage }] : [],
      }
      const existing = vehiclesByCustomer.get(vehicle.customer_id)
      if (existing) {
        existing.push(hydratedVehicle)
      } else {
        vehiclesByCustomer.set(vehicle.customer_id, [hydratedVehicle])
      }
    }

    const hydratedCustomers = customers.map(customer => ({
      ...customer,
      vehicles: vehiclesByCustomer.get(customer.id) ?? [],
    }))

    const total = count ?? 0
    return NextResponse.json({ data: hydratedCustomers, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('[customers] GET:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const body = await request.json()
    const data = createCustomerSchema.parse(body)

    const duplicateRes = await db
      .from('customers')
      .select('id')
      .eq('org_id', orgId)
      .eq('phone', data.phone)
      .maybeSingle()
    assertSupabaseError(duplicateRes.error, 'Failed to check duplicate customer phone')

    if (duplicateRes.data) {
      return NextResponse.json({ error: 'A customer with this phone number already exists' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const customerId = crypto.randomUUID()
    const customerInsertRes = await db
      .from('customers')
      .insert({
        id: customerId,
        name: `${data.firstName} ${data.lastName}`.trim(),
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        email: data.email || null,
        status: CustomerStatusValues.up_to_date,
        org_id: orgId,
        tags: [],
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single()
    assertSupabaseError(customerInsertRes.error, 'Failed to create customer')
    const customer = customerInsertRes.data

    let vehicles: unknown[] = []
    if (data.vehicles.length > 0) {
      const vehicleRows = data.vehicles.map(vehicle => ({
        id: crypto.randomUUID(),
        org_id: orgId,
        customer_id: customerId,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        license_plate: vehicle.licensePlate || null,
        vin: null,
        mileage_at_last_service: null,
        created_at: now,
        updated_at: now,
      }))
      const vehiclesInsertRes = await db.from('vehicles').insert(vehicleRows).select('*')
      assertSupabaseError(vehiclesInsertRes.error, 'Failed to create customer vehicles')
      vehicles = vehiclesInsertRes.data ?? []
    }

    return NextResponse.json({ ...customer, vehicles }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    console.error('[customers] POST:', error)
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const body = await request.json()
    const { id, firstName, lastName, phone, email, smsConsent, preferredContactTime } = updateCustomerSchema.parse(body)

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (firstName !== undefined) updatePayload.first_name = firstName
    if (lastName !== undefined) updatePayload.last_name = lastName
    if (phone !== undefined) updatePayload.phone = phone
    if (email !== undefined) updatePayload.email = email
    if (smsConsent !== undefined) updatePayload.sms_consent = smsConsent
    if (preferredContactTime !== undefined) updatePayload.preferred_contact_time = preferredContactTime

    const { data: updatedRows, error } = await db
      .from('customers')
      .update(updatePayload)
      .eq('id', id)
      .eq('org_id', orgId)
      .select('id')
    assertSupabaseError(error, 'Failed to update customer')

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    console.error('[customers] PATCH:', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
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

    if (!id) return NextResponse.json({ error: 'Customer ID required' }, { status: 400 })

    const { error } = await db.from('customers').delete().eq('id', id).eq('org_id', orgId)
    assertSupabaseError(error, 'Failed to delete customer')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[customers] DELETE:', error)
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}
