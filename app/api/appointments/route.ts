import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { AppointmentStatus, type AppointmentStatus as AppointmentStatusValue } from '@/lib/db/enums'
import { assertSupabaseError, getOttoClient } from '@/lib/supabase/otto'

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
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getOttoClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const customerId = searchParams.get('customerId')

    let query = db
      .from('appointments')
      .select('id, customerId, vehicleId, locationId, scheduledAt, duration, status, serviceTypeNames, notes')
      .eq('orgId', orgId)
      .order('scheduledAt', { ascending: true })

    if (isAppointmentStatus(status)) {
      query = query.eq('status', status)
    }
    if (customerId) {
      query = query.eq('customerId', customerId)
    }
    if (from) {
      query = query.gte('scheduledAt', new Date(from).toISOString())
    }
    if (to) {
      query = query.lte('scheduledAt', new Date(to).toISOString())
    }

    const { data: appointmentRows, error: appointmentsError } = await query
    assertSupabaseError(appointmentsError, 'Failed to fetch appointments')
    const appointments = appointmentRows ?? []

    const customerIds = Array.from(new Set(appointments.map((appt) => appt.customerId as string)))
    const vehicleIds = Array.from(new Set(appointments.map((appt) => appt.vehicleId).filter((id): id is string => Boolean(id))))

    const [customersRes, vehiclesRes] = await Promise.all([
      customerIds.length > 0
        ? db.from('customers').select('id, firstName, lastName, phone').in('id', customerIds)
        : Promise.resolve({ data: [], error: null }),
      vehicleIds.length > 0
        ? db.from('vehicles').select('id, year, make, model').in('id', vehicleIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    assertSupabaseError(customersRes.error, 'Failed to fetch appointment customers')
    assertSupabaseError(vehiclesRes.error, 'Failed to fetch appointment vehicles')

    const customerById = new Map((customersRes.data ?? []).map((customer) => [customer.id as string, customer]))
    const vehicleById = new Map((vehiclesRes.data ?? []).map((vehicle) => [vehicle.id as string, vehicle]))

    const hydratedAppointments = appointments.flatMap((appointment) => {
      const customer = customerById.get(appointment.customerId as string)
      if (!customer) return []

      return [{
        ...appointment,
        customer,
        vehicle: appointment.vehicleId ? vehicleById.get(appointment.vehicleId as string) ?? null : null,
      }]
    })

    return NextResponse.json({ data: hydratedAppointments })
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getOttoClient()
    const body: CreateAppointmentBody = await request.json()
    const { customerId, vehicleId, scheduledAt, duration, serviceTypeNames, notes } = body

    const customerRes = await db
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('orgId', orgId)
      .maybeSingle()
    assertSupabaseError(customerRes.error, 'Failed to verify customer for appointment')

    if (!customerRes.data) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const appointmentRes = await db
      .from('appointments')
      .insert({
        id: crypto.randomUUID(),
        orgId,
        customerId,
        vehicleId: vehicleId ?? null,
        scheduledAt: new Date(scheduledAt).toISOString(),
        duration: duration ?? 60,
        status: AppointmentStatus.scheduled,
        serviceTypeNames: serviceTypeNames ?? [],
        notes: notes ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .select('*')
      .single()

    assertSupabaseError(appointmentRes.error, 'Failed to create appointment')
    return NextResponse.json(appointmentRes.data, { status: 201 })
  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
  }
}
