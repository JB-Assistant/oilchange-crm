import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { AppointmentStatus, type AppointmentStatus as AppointmentStatusValue } from '@/lib/db/enums'
import { assertSupabaseError } from '@/lib/supabase/otto'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'

interface CreateAppointmentBody {
  customerId: string
  vehicleId?: string
  scheduledAt: string
  duration?: number
  serviceTypeNames?: string[]
  notes?: string
}

function isAppointmentStatus(value: string | null): value is AppointmentStatusValue {
  if (!value) return false
  return Object.values(AppointmentStatus).includes(value as AppointmentStatusValue)
}

export async function GET(request: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const customerId = searchParams.get('customerId')

    let query = db
      .from('appointments')
      .select('id, customer_id, vehicle_id, location_id, scheduled_at, duration, status, service_type_names, notes')
      .eq('org_id', orgId)
      .order('scheduled_at', { ascending: true })

    if (isAppointmentStatus(status)) query = query.eq('status', status)
    if (customerId) query = query.eq('customer_id', customerId)
    if (from) query = query.gte('scheduled_at', new Date(from).toISOString())
    if (to) query = query.lte('scheduled_at', new Date(to).toISOString())

    const { data: appointmentRows, error: appointmentsError } = await query
    assertSupabaseError(appointmentsError, 'Failed to fetch appointments')
    const appointments = appointmentRows ?? []

    const customerIds = Array.from(new Set(appointments.map(appt => appt.customer_id as string)))
    const vehicleIds = Array.from(new Set(appointments.map(appt => appt.vehicle_id).filter((id): id is string => Boolean(id))))

    const [customersRes, vehiclesRes] = await Promise.all([
      customerIds.length > 0
        ? db.from('customers').select('id, first_name, last_name, phone').in('id', customerIds)
        : Promise.resolve({ data: [], error: null }),
      vehicleIds.length > 0
        ? db.from('vehicles').select('id, year, make, model').in('id', vehicleIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    assertSupabaseError(customersRes.error, 'Failed to fetch appointment customers')
    assertSupabaseError(vehiclesRes.error, 'Failed to fetch appointment vehicles')

    const customerById = new Map((customersRes.data ?? []).map(c => [c.id as string, c]))
    const vehicleById = new Map((vehiclesRes.data ?? []).map(v => [v.id as string, v]))

    const hydratedAppointments = appointments.flatMap(appointment => {
      const customer = customerById.get(appointment.customer_id as string)
      if (!customer) return []
      return [{
        ...appointment,
        customer,
        vehicle: appointment.vehicle_id ? vehicleById.get(appointment.vehicle_id as string) ?? null : null,
      }]
    })

    return NextResponse.json({ data: hydratedAppointments })
  } catch (error) {
    console.error('[appointments] GET:', error)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const body: CreateAppointmentBody = await request.json()
    const { customerId, vehicleId, scheduledAt, duration, serviceTypeNames, notes } = body

    const customerRes = await db
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('org_id', orgId)
      .maybeSingle()
    assertSupabaseError(customerRes.error, 'Failed to verify customer for appointment')

    if (!customerRes.data) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const now = new Date().toISOString()
    const appointmentRes = await db
      .from('appointments')
      .insert({
        id: crypto.randomUUID(),
        org_id: orgId,
        customer_id: customerId,
        vehicle_id: vehicleId ?? null,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration: duration ?? 60,
        status: AppointmentStatus.scheduled,
        service_type_names: serviceTypeNames ?? [],
        notes: notes ?? null,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single()
    assertSupabaseError(appointmentRes.error, 'Failed to create appointment')

    return NextResponse.json(appointmentRes.data, { status: 201 })
  } catch (error) {
    console.error('[appointments] POST:', error)
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
  }
}
