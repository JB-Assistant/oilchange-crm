import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { assertSupabaseError, getOttoClient } from '@/lib/supabase/otto'

interface ActivityItem {
  id: string
  type: 'service' | 'follow_up' | 'reminder' | 'consent' | 'note'
  title: string
  description: string
  date: string
}

interface VehicleRow {
  id: string
  year: number
  make: string
  model: string
}

interface ServiceRow {
  id: string
  vehicleId: string
  serviceType: string
  mileageAtService: number
  serviceDate: string
}

interface FollowUpRow {
  id: string
  serviceRecordId: string
  method: string
  outcome: string
  notes: string | null
  contactDate: string
}

interface ReminderRow {
  id: string
  direction: string
  body: string
  sentAt: string | null
  scheduledAt: string
}

interface ConsentRow {
  id: string
  action: string
  source: string
  createdAt: string
}

interface NoteRow {
  id: string
  body: string
  createdAt: string
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const db = getOttoClient()

    const customerRes = await db
      .from('customers')
      .select('id')
      .eq('id', id)
      .eq('orgId', orgId)
      .maybeSingle()
    assertSupabaseError(customerRes.error, 'Failed to verify customer for activity')

    if (!customerRes.data) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const vehiclesRes = await db
      .from('vehicles')
      .select('id, year, make, model')
      .eq('customerId', id)
    assertSupabaseError(vehiclesRes.error, 'Failed to fetch customer vehicles for activity')

    const vehicles = (vehiclesRes.data ?? []) as VehicleRow[]
    const vehicleIds = vehicles.map((vehicle) => vehicle.id)
    const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]))

    const [servicesRes, followUpsRes, remindersRes, consentsRes, notesRes] = await Promise.all([
      vehicleIds.length > 0
        ? db
            .from('service_records')
            .select('id, vehicleId, serviceType, mileageAtService, serviceDate')
            .in('vehicleId', vehicleIds)
            .order('serviceDate', { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [], error: null }),
      db
        .from('follow_up_records')
        .select('id, serviceRecordId, method, outcome, notes, contactDate')
        .eq('customerId', id)
        .order('contactDate', { ascending: false })
        .limit(50),
      db
        .from('reminder_messages')
        .select('id, direction, body, sentAt, scheduledAt')
        .eq('customerId', id)
        .order('createdAt', { ascending: false })
        .limit(50),
      db
        .from('consent_logs')
        .select('id, action, source, createdAt')
        .eq('customerId', id)
        .order('createdAt', { ascending: false })
        .limit(20),
      db
        .from('customer_notes')
        .select('id, body, createdAt')
        .eq('customerId', id)
        .order('createdAt', { ascending: false })
        .limit(50),
    ])

    assertSupabaseError(servicesRes.error, 'Failed to fetch service activity')
    assertSupabaseError(followUpsRes.error, 'Failed to fetch follow-up activity')
    assertSupabaseError(remindersRes.error, 'Failed to fetch reminder activity')
    assertSupabaseError(consentsRes.error, 'Failed to fetch consent activity')
    assertSupabaseError(notesRes.error, 'Failed to fetch notes activity')

    const services = (servicesRes.data ?? []) as ServiceRow[]
    const followUps = (followUpsRes.data ?? []) as FollowUpRow[]
    const reminders = (remindersRes.data ?? []) as ReminderRow[]
    const consents = (consentsRes.data ?? []) as ConsentRow[]
    const notes = (notesRes.data ?? []) as NoteRow[]
    const serviceById = new Map(services.map((service) => [service.id, service]))

    const activity: ActivityItem[] = []

    for (const service of services) {
      const vehicle = vehicleById.get(service.vehicleId)
      if (!vehicle) continue

      activity.push({
        id: service.id,
        type: 'service',
        title: `${service.serviceType.replace(/_/g, ' ')} service`,
        description: `${vehicle.year} ${vehicle.make} ${vehicle.model} at ${service.mileageAtService.toLocaleString()} mi`,
        date: service.serviceDate,
      })
    }

    for (const followUp of followUps) {
      activity.push({
        id: followUp.id,
        type: 'follow_up',
        title: `Follow-up (${followUp.method})`,
        description: `${followUp.outcome.replace(/_/g, ' ')}${followUp.notes ? ` — ${followUp.notes}` : ''}`,
        date: followUp.contactDate,
      })

      const service = serviceById.get(followUp.serviceRecordId)
      if (!service) continue
    }

    for (const reminder of reminders) {
      activity.push({
        id: reminder.id,
        type: 'reminder',
        title: `SMS ${reminder.direction === 'inbound' ? 'received' : 'sent'}`,
        description: reminder.body.slice(0, 100) + (reminder.body.length > 100 ? '...' : ''),
        date: reminder.sentAt || reminder.scheduledAt,
      })
    }

    for (const consent of consents) {
      activity.push({
        id: consent.id,
        type: 'consent',
        title: consent.action === 'opt_in' ? 'SMS opt-in' : 'SMS opt-out',
        description: `Via ${consent.source.replace(/_/g, ' ')}`,
        date: consent.createdAt,
      })
    }

    for (const note of notes) {
      activity.push({
        id: note.id,
        type: 'note',
        title: 'Note added',
        description: note.body.slice(0, 100) + (note.body.length > 100 ? '...' : ''),
        date: note.createdAt,
      })
    }

    activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return NextResponse.json(activity.slice(0, 100))
  } catch (error) {
    console.error('Error fetching activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
