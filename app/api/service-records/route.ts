import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { CustomerStatus } from '@/lib/db/enums'
import { calculateNextDueDate, calculateNextDueMileage, getStatusFromDueDate } from '@/lib/customer-status'
import { createServiceRecordSchema } from '@/lib/validations'
import { assertSupabaseError, getOttoClient } from '@/lib/supabase/otto'
import { ZodError } from 'zod'

interface CustomerRow {
  id: string
  orgId: string
}

interface VehicleRow {
  id: string
  customerId: string
  mileageAtLastService: number | null
}

interface ServiceRecordRow {
  id: string
  vehicleId: string
  serviceDate: string
  nextDueDate: string
  nextDueMileage: number
}

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getOttoClient()
    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get('vehicleId')

    const customersRes = await db
      .from('customers')
      .select('id')
      .eq('orgId', orgId)
    assertSupabaseError(customersRes.error, 'Failed to fetch customers for service records')

    const customerIds = (customersRes.data ?? []).map((row) => row.id as string)
    if (customerIds.length === 0) return NextResponse.json([])

    let vehiclesQuery = db
      .from('vehicles')
      .select('id, customerId, year, make, model')
      .in('customerId', customerIds)

    if (vehicleId) {
      vehiclesQuery = vehiclesQuery.eq('id', vehicleId)
    }

    const vehiclesRes = await vehiclesQuery
    assertSupabaseError(vehiclesRes.error, 'Failed to fetch vehicles for service records')
    const vehicles = vehiclesRes.data ?? []
    const vehicleIds = vehicles.map((vehicle) => vehicle.id as string)
    if (vehicleIds.length === 0) return NextResponse.json([])

    const serviceRes = await db
      .from('service_records')
      .select('*')
      .in('vehicleId', vehicleIds)
      .order('serviceDate', { ascending: false })
    assertSupabaseError(serviceRes.error, 'Failed to fetch service records')

    const customerRes = await db
      .from('customers')
      .select('*')
      .in('id', customerIds)
    assertSupabaseError(customerRes.error, 'Failed to fetch customers for service records payload')

    const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id as string, vehicle]))
    const customerById = new Map((customerRes.data ?? []).map((customer) => [customer.id as string, customer]))
    const hydratedRecords = (serviceRes.data ?? []).flatMap((record) => {
      const vehicle = vehicleById.get(record.vehicleId as string)
      if (!vehicle) return []
      const customer = customerById.get(vehicle.customerId as string)
      if (!customer) return []
      return [{
        ...record,
        vehicle: {
          ...vehicle,
          customer,
        },
      }]
    })

    return NextResponse.json(hydratedRecords)
  } catch (error) {
    console.error('Error fetching service records:', error)
    return NextResponse.json({ error: 'Failed to fetch service records' }, { status: 500 })
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
    const data = createServiceRecordSchema.parse(body)
    const { vehicleId, serviceDate, mileageAtService, serviceType, notes } = data

    const vehicleRes = await db
      .from('vehicles')
      .select('id, customerId, mileageAtLastService')
      .eq('id', vehicleId)
      .maybeSingle()
    assertSupabaseError(vehicleRes.error, 'Failed to fetch vehicle for service record')

    const vehicle = vehicleRes.data as VehicleRow | null
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    const customerRes = await db
      .from('customers')
      .select('id, orgId')
      .eq('id', vehicle.customerId)
      .maybeSingle()
    assertSupabaseError(customerRes.error, 'Failed to verify service record customer org')

    const customer = customerRes.data as CustomerRow | null
    if (!customer || customer.orgId !== orgId) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    const serviceTypeDefRes = await db
      .from('service_types')
      .select('defaultTimeIntervalDays, defaultMileageInterval')
      .eq('orgId', orgId)
      .eq('name', serviceType || 'oil_change_standard')
      .maybeSingle()
    assertSupabaseError(serviceTypeDefRes.error, 'Failed to fetch service type defaults')

    const serviceTypeDef = serviceTypeDefRes.data
    const serviceDateObj = new Date(serviceDate)
    const nextDueDate = calculateNextDueDate(serviceDateObj, serviceTypeDef?.defaultTimeIntervalDays)
    const nextDueMileage = calculateNextDueMileage(mileageAtService, serviceTypeDef?.defaultMileageInterval)
    const now = new Date().toISOString()

    const insertRes = await db
      .from('service_records')
      .insert({
        id: crypto.randomUUID(),
        vehicleId,
        serviceDate: serviceDateObj.toISOString(),
        mileageAtService,
        serviceType: serviceType || 'oil_change',
        notes: notes || null,
        nextDueDate: nextDueDate.toISOString(),
        nextDueMileage,
        createdAt: now,
        updatedAt: now,
      })
      .select('*')
      .single()
    assertSupabaseError(insertRes.error, 'Failed to create service record')

    const vehicleUpdateRes = await db
      .from('vehicles')
      .update({
        mileageAtLastService: mileageAtService,
        updatedAt: now,
      })
      .eq('id', vehicleId)
    assertSupabaseError(vehicleUpdateRes.error, 'Failed to update vehicle mileage')

    await updateCustomerStatus(customer.id, orgId)
    return NextResponse.json(insertRes.data, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Error creating service record:', error)
    return NextResponse.json({ error: 'Failed to create service record' }, { status: 500 })
  }
}

async function updateCustomerStatus(customerId: string, orgId: string) {
  const db = getOttoClient()
  const vehiclesRes = await db
    .from('vehicles')
    .select('id, customerId, mileageAtLastService')
    .eq('customerId', customerId)
  assertSupabaseError(vehiclesRes.error, 'Failed to fetch vehicles for customer status update')

  const vehicles = (vehiclesRes.data ?? []) as VehicleRow[]
  const vehicleIds = vehicles.map((vehicle) => vehicle.id)
  let serviceRecords: ServiceRecordRow[] = []

  if (vehicleIds.length > 0) {
    const servicesRes = await db
      .from('service_records')
      .select('id, vehicleId, serviceDate, nextDueDate, nextDueMileage')
      .in('vehicleId', vehicleIds)
      .order('serviceDate', { ascending: false })
    assertSupabaseError(servicesRes.error, 'Failed to fetch services for customer status update')
    serviceRecords = (servicesRes.data ?? []) as ServiceRecordRow[]
  }

  const latestByVehicle = new Map<string, ServiceRecordRow>()
  for (const record of serviceRecords) {
    if (!latestByVehicle.has(record.vehicleId)) {
      latestByVehicle.set(record.vehicleId, record)
    }
  }

  let mostUrgentStatus: CustomerStatus = CustomerStatus.up_to_date
  for (const vehicle of vehicles) {
    const latestService = latestByVehicle.get(vehicle.id)
    if (!latestService) continue

    const status = getStatusFromDueDate(
      new Date(latestService.nextDueDate),
      latestService.nextDueMileage,
      vehicle.mileageAtLastService || 0
    )

    if (status === CustomerStatus.overdue) {
      mostUrgentStatus = CustomerStatus.overdue
      break
    }
    if (status === CustomerStatus.due_now) {
      mostUrgentStatus = CustomerStatus.due_now
      continue
    }
    if (status === CustomerStatus.due_soon && mostUrgentStatus === CustomerStatus.up_to_date) {
      mostUrgentStatus = CustomerStatus.due_soon
    }
  }

  const updateRes = await db
    .from('customers')
    .update({
      status: mostUrgentStatus,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', customerId)
    .eq('orgId', orgId)
  assertSupabaseError(updateRes.error, 'Failed to update customer status')
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
      return NextResponse.json({ error: 'Service record ID required' }, { status: 400 })
    }

    const recordRes = await db
      .from('service_records')
      .select('id, vehicleId')
      .eq('id', id)
      .maybeSingle()
    assertSupabaseError(recordRes.error, 'Failed to fetch service record for delete')

    if (!recordRes.data) {
      return NextResponse.json({ error: 'Service record not found' }, { status: 404 })
    }

    const vehicleRes = await db
      .from('vehicles')
      .select('id, customerId')
      .eq('id', recordRes.data.vehicleId as string)
      .maybeSingle()
    assertSupabaseError(vehicleRes.error, 'Failed to verify service record ownership')

    if (!vehicleRes.data) {
      return NextResponse.json({ error: 'Service record not found' }, { status: 404 })
    }

    const customerRes = await db
      .from('customers')
      .select('id')
      .eq('id', vehicleRes.data.customerId as string)
      .eq('orgId', orgId)
      .maybeSingle()
    assertSupabaseError(customerRes.error, 'Failed to verify service record customer ownership')

    if (!customerRes.data) {
      return NextResponse.json({ error: 'Service record not found' }, { status: 404 })
    }

    const deleteRes = await db
      .from('service_records')
      .delete()
      .eq('id', id)
    assertSupabaseError(deleteRes.error, 'Failed to delete service record')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting service record:', error)
    return NextResponse.json({ error: 'Failed to delete service record' }, { status: 500 })
  }
}
