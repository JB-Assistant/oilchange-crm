import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { assertSupabaseError } from '@/lib/supabase/otto'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'

interface ActivityItem {
  id: string
  type: 'service' | 'follow_up' | 'reminder' | 'consent' | 'note'
  title: string
  description: string
  date: string
}

interface VehicleRow { id: string; year: number; make: string; model: string }
interface ServiceRow { id: string; vehicle_id: string; service_type: string; mileage_at_service: number; service_date: string }
interface FollowUpRow { id: string; repair_order_id: string; method: string; outcome: string; notes: string | null; contact_date: string }
interface ReminderRow { id: string; direction: string; body: string; sent_at: string | null; scheduled_at: string }
interface ConsentRow { id: string; action: string; source: string; created_at: string }
interface NoteRow { id: string; body: string; created_at: string }

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId: clerkOrgId } = await auth()
    if (!userId || !clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()

    const customerRes = await db
      .from('customers')
      .select('id')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle()
    assertSupabaseError(customerRes.error, 'Failed to verify customer for activity')

    if (!customerRes.data) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const vehiclesRes = await db
      .from('vehicles')
      .select('id, year, make, model')
      .eq('customer_id', id)
    assertSupabaseError(vehiclesRes.error, 'Failed to fetch customer vehicles for activity')

    const vehicles = (vehiclesRes.data ?? []) as VehicleRow[]
    const vehicleIds = vehicles.map(v => v.id)
    const vehicleById = new Map(vehicles.map(v => [v.id, v]))

    const [servicesRes, followUpsRes, remindersRes, consentsRes, notesRes] = await Promise.all([
      vehicleIds.length > 0
        ? db.from('repair_orders')
            .select('id, vehicle_id, service_type, mileage_at_service, service_date')
            .in('vehicle_id', vehicleIds)
            .order('service_date', { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [], error: null }),
      db.from('follow_up_records')
        .select('id, repair_order_id, method, outcome, notes, contact_date')
        .eq('customer_id', id)
        .order('contact_date', { ascending: false })
        .limit(50),
      db.from('reminder_messages')
        .select('id, direction, body, sent_at, scheduled_at')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      db.from('consent_logs')
        .select('id, action, source, created_at')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
      db.from('customer_notes')
        .select('id, body, created_at')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
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

    const activity: ActivityItem[] = []

    for (const service of services) {
      const vehicle = vehicleById.get(service.vehicle_id)
      if (!vehicle) continue
      activity.push({
        id: service.id, type: 'service',
        title: `${service.service_type.replace(/_/g, ' ')} service`,
        description: `${vehicle.year} ${vehicle.make} ${vehicle.model} at ${service.mileage_at_service.toLocaleString()} mi`,
        date: service.service_date,
      })
    }

    for (const followUp of followUps) {
      activity.push({
        id: followUp.id, type: 'follow_up',
        title: `Follow-up (${followUp.method})`,
        description: `${followUp.outcome.replace(/_/g, ' ')}${followUp.notes ? ` — ${followUp.notes}` : ''}`,
        date: followUp.contact_date,
      })
    }

    for (const reminder of reminders) {
      activity.push({
        id: reminder.id, type: 'reminder',
        title: `SMS ${reminder.direction === 'inbound' ? 'received' : 'sent'}`,
        description: reminder.body.slice(0, 100) + (reminder.body.length > 100 ? '...' : ''),
        date: reminder.sent_at || reminder.scheduled_at,
      })
    }

    for (const consent of consents) {
      activity.push({
        id: consent.id, type: 'consent',
        title: consent.action === 'opt_in' ? 'SMS opt-in' : 'SMS opt-out',
        description: `Via ${consent.source.replace(/_/g, ' ')}`,
        date: consent.created_at,
      })
    }

    for (const note of notes) {
      activity.push({
        id: note.id, type: 'note',
        title: 'Note added',
        description: note.body.slice(0, 100) + (note.body.length > 100 ? '...' : ''),
        date: note.created_at,
      })
    }

    activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return NextResponse.json(activity.slice(0, 100))
  } catch (error) {
    console.error('[customers/activity] GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
