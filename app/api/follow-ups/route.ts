import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createFollowUpSchema } from '@/lib/validations'
import { assertSupabaseError, getOttoClient } from '@/lib/supabase/otto'
import { ZodError } from 'zod'

interface FollowUpRow {
  id: string
  customerId: string
  serviceRecordId: string
}

interface CustomerRow {
  id: string
  firstName: string
  lastName: string
}

interface ServiceRecordRow {
  id: string
  vehicleId: string
}

interface VehicleRow {
  id: string
  year: number
  make: string
  model: string
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
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '50', 10))

    let query = db
      .from('follow_up_records')
      .select('*')
      .eq('orgId', orgId)
      .order('contactDate', { ascending: false })
      .limit(limit)

    if (customerId) {
      query = query.eq('customerId', customerId)
    }

    const recordsRes = await query
    assertSupabaseError(recordsRes.error, 'Failed to fetch follow-up records')
    const records = (recordsRes.data ?? []) as FollowUpRow[]

    const customerIds = Array.from(new Set(records.map((record) => record.customerId)))
    const serviceRecordIds = Array.from(new Set(records.map((record) => record.serviceRecordId)))

    const [customersRes, serviceRecordsRes] = await Promise.all([
      customerIds.length > 0
        ? db.from('customers').select('id, firstName, lastName').in('id', customerIds)
        : Promise.resolve({ data: [], error: null }),
      serviceRecordIds.length > 0
        ? db.from('service_records').select('id, vehicleId').in('id', serviceRecordIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    assertSupabaseError(customersRes.error, 'Failed to fetch follow-up customers')
    assertSupabaseError(serviceRecordsRes.error, 'Failed to fetch follow-up service records')

    const serviceRows = (serviceRecordsRes.data ?? []) as ServiceRecordRow[]
    const vehicleIds = Array.from(new Set(serviceRows.map((service) => service.vehicleId)))
    const vehiclesRes = vehicleIds.length > 0
      ? await db.from('vehicles').select('id, year, make, model').in('id', vehicleIds)
      : { data: [], error: null }

    assertSupabaseError(vehiclesRes.error, 'Failed to fetch follow-up vehicles')

    const customerById = new Map(((customersRes.data ?? []) as CustomerRow[]).map((customer) => [customer.id, customer]))
    const serviceById = new Map(serviceRows.map((service) => [service.id, service]))
    const vehicleById = new Map(((vehiclesRes.data ?? []) as VehicleRow[]).map((vehicle) => [vehicle.id, vehicle]))

    const hydratedRecords = records.map((record) => {
      const serviceRecord = serviceById.get(record.serviceRecordId)
      const vehicle = serviceRecord ? vehicleById.get(serviceRecord.vehicleId) : null
      return {
        ...record,
        customer: customerById.get(record.customerId) ?? null,
        serviceRecord: serviceRecord ? {
          ...serviceRecord,
          vehicle: vehicle ?? null,
        } : null,
      }
    })

    return NextResponse.json(hydratedRecords)
  } catch (error) {
    console.error('Error fetching follow-up records:', error)
    return NextResponse.json({ error: 'Failed to fetch follow-up records' }, { status: 500 })
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
    const data = createFollowUpSchema.parse(body)
    const { customerId, serviceRecordId, method, outcome, notes, staffMember } = data

    const customerRes = await db
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('orgId', orgId)
      .maybeSingle()
    assertSupabaseError(customerRes.error, 'Failed to verify follow-up customer')

    if (!customerRes.data) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const serviceRes = await db
      .from('service_records')
      .select('id, vehicleId')
      .eq('id', serviceRecordId)
      .maybeSingle()
    assertSupabaseError(serviceRes.error, 'Failed to verify follow-up service record')

    if (!serviceRes.data) {
      return NextResponse.json({ error: 'Service record not found' }, { status: 404 })
    }

    const vehicleRes = await db
      .from('vehicles')
      .select('id')
      .eq('id', serviceRes.data.vehicleId as string)
      .eq('customerId', customerId)
      .maybeSingle()
    assertSupabaseError(vehicleRes.error, 'Failed to verify follow-up service ownership')

    if (!vehicleRes.data) {
      return NextResponse.json({ error: 'Service record not found' }, { status: 404 })
    }

    const recordRes = await db
      .from('follow_up_records')
      .insert({
        id: crypto.randomUUID(),
        customerId,
        serviceRecordId,
        orgId,
        contactDate: new Date().toISOString(),
        method,
        outcome,
        notes: notes ?? null,
        staffMember: staffMember ?? null,
        createdAt: new Date().toISOString(),
      })
      .select('*')
      .single()

    assertSupabaseError(recordRes.error, 'Failed to create follow-up record')
    return NextResponse.json(recordRes.data, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Error creating follow-up record:', error)
    return NextResponse.json({ error: 'Failed to create follow-up record' }, { status: 500 })
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
      return NextResponse.json({ error: 'Follow-up record ID required' }, { status: 400 })
    }

    const recordRes = await db
      .from('follow_up_records')
      .select('id')
      .eq('id', id)
      .eq('orgId', orgId)
      .maybeSingle()
    assertSupabaseError(recordRes.error, 'Failed to verify follow-up record')

    if (!recordRes.data) {
      return NextResponse.json({ error: 'Follow-up record not found' }, { status: 404 })
    }

    const deleteRes = await db
      .from('follow_up_records')
      .delete()
      .eq('id', id)
    assertSupabaseError(deleteRes.error, 'Failed to delete follow-up record')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting follow-up record:', error)
    return NextResponse.json({ error: 'Failed to delete follow-up record' }, { status: 500 })
  }
}
