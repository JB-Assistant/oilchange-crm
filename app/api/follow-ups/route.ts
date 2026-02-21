import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createFollowUpSchema } from '@/lib/validations'
import { assertSupabaseError } from '@/lib/supabase/otto'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'
import { ZodError } from 'zod'

interface FollowUpRow {
  id: string
  customer_id: string
  repair_order_id: string
}

interface CustomerRow {
  id: string
  first_name: string
  last_name: string
}

interface RepairOrderRow {
  id: string
  vehicle_id: string
}

interface VehicleRow {
  id: string
  year: number
  make: string
  model: string
}

export async function GET(request: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '50', 10))

    let query = db
      .from('follow_up_records')
      .select('*')
      .eq('org_id', orgId)
      .order('contact_date', { ascending: false })
      .limit(limit)

    if (customerId) query = query.eq('customer_id', customerId)

    const recordsRes = await query
    assertSupabaseError(recordsRes.error, 'Failed to fetch follow-up records')
    const records = (recordsRes.data ?? []) as FollowUpRow[]

    const customerIds = Array.from(new Set(records.map(r => r.customer_id)))
    const repairOrderIds = Array.from(new Set(records.map(r => r.repair_order_id).filter(Boolean)))

    const [customersRes, repairOrdersRes] = await Promise.all([
      customerIds.length > 0
        ? db.from('customers').select('id, first_name, last_name').in('id', customerIds)
        : Promise.resolve({ data: [], error: null }),
      repairOrderIds.length > 0
        ? db.from('repair_orders').select('id, vehicle_id').in('id', repairOrderIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    assertSupabaseError(customersRes.error, 'Failed to fetch follow-up customers')
    assertSupabaseError(repairOrdersRes.error, 'Failed to fetch follow-up repair orders')

    const repairOrderRows = (repairOrdersRes.data ?? []) as RepairOrderRow[]
    const vehicleIds = Array.from(new Set(repairOrderRows.map(ro => ro.vehicle_id)))
    const vehiclesRes = vehicleIds.length > 0
      ? await db.from('vehicles').select('id, year, make, model').in('id', vehicleIds)
      : { data: [], error: null }
    assertSupabaseError(vehiclesRes.error, 'Failed to fetch follow-up vehicles')

    const customerById = new Map(((customersRes.data ?? []) as CustomerRow[]).map(c => [c.id, c]))
    const repairOrderById = new Map(repairOrderRows.map(ro => [ro.id, ro]))
    const vehicleById = new Map(((vehiclesRes.data ?? []) as VehicleRow[]).map(v => [v.id, v]))

    const hydratedRecords = records.map(record => {
      const repairOrder = repairOrderById.get(record.repair_order_id)
      const vehicle = repairOrder ? vehicleById.get(repairOrder.vehicle_id) : null
      return {
        ...record,
        customer: customerById.get(record.customer_id) ?? null,
        serviceRecord: repairOrder ? { ...repairOrder, vehicle: vehicle ?? null } : null,
      }
    })

    return NextResponse.json(hydratedRecords)
  } catch (error) {
    console.error('[follow-ups] GET:', error)
    return NextResponse.json({ error: 'Failed to fetch follow-up records' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const body = await request.json()
    const data = createFollowUpSchema.parse(body)
    const { customerId, serviceRecordId, method, outcome, notes, staffMember } = data

    const customerRes = await db
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('org_id', orgId)
      .maybeSingle()
    assertSupabaseError(customerRes.error, 'Failed to verify follow-up customer')

    if (!customerRes.data) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const repairOrderRes = await db
      .from('repair_orders')
      .select('id, vehicle_id')
      .eq('id', serviceRecordId)
      .maybeSingle()
    assertSupabaseError(repairOrderRes.error, 'Failed to verify follow-up repair order')

    if (!repairOrderRes.data) return NextResponse.json({ error: 'Service record not found' }, { status: 404 })

    const vehicleRes = await db
      .from('vehicles')
      .select('id')
      .eq('id', repairOrderRes.data.vehicle_id as string)
      .eq('customer_id', customerId)
      .maybeSingle()
    assertSupabaseError(vehicleRes.error, 'Failed to verify follow-up service ownership')

    if (!vehicleRes.data) return NextResponse.json({ error: 'Service record not found' }, { status: 404 })

    const now = new Date().toISOString()
    const recordRes = await db
      .from('follow_up_records')
      .insert({
        id: crypto.randomUUID(),
        customer_id: customerId,
        repair_order_id: serviceRecordId,
        org_id: orgId,
        contact_date: now,
        method,
        outcome,
        notes: notes ?? null,
        staff_member: staffMember ?? null,
        created_at: now,
      })
      .select('*')
      .single()
    assertSupabaseError(recordRes.error, 'Failed to create follow-up record')

    return NextResponse.json(recordRes.data, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    console.error('[follow-ups] POST:', error)
    return NextResponse.json({ error: 'Failed to create follow-up record' }, { status: 500 })
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

    if (!id) return NextResponse.json({ error: 'Follow-up record ID required' }, { status: 400 })

    const recordRes = await db
      .from('follow_up_records')
      .select('id')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle()
    assertSupabaseError(recordRes.error, 'Failed to verify follow-up record')

    if (!recordRes.data) return NextResponse.json({ error: 'Follow-up record not found' }, { status: 404 })

    const deleteRes = await db.from('follow_up_records').delete().eq('id', id)
    assertSupabaseError(deleteRes.error, 'Failed to delete follow-up record')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[follow-ups] DELETE:', error)
    return NextResponse.json({ error: 'Failed to delete follow-up record' }, { status: 500 })
  }
}
