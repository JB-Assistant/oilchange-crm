export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, User, Car } from 'lucide-react'
import { CreateAppointmentDialog } from '@/components/appointments/create-appointment-dialog'
import { AppointmentStatus, type AppointmentStatus as AppointmentStatusValue } from '@/lib/db/enums'
import { assertSupabaseError } from '@/lib/supabase/otto'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'
const STATUS_CFG: Record<AppointmentStatusValue, { label: string; variant: BadgeVariant; className?: string }> = {
  scheduled: { label: 'Scheduled', variant: 'secondary', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  confirmed: { label: 'Confirmed', variant: 'secondary', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  in_progress: { label: 'In Progress', variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  completed: { label: 'Completed', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  no_show: { label: 'No Show', variant: 'outline' },
}

interface AppointmentRow {
  id: string
  customer_id: string
  vehicle_id: string | null
  location_id: string | null
  scheduled_at: string
  duration: number
  status: AppointmentStatusValue
  notes: string | null
  service_type_names: string[] | null
}

interface CustomerRow {
  id: string
  first_name: string
  last_name: string
  phone: string
}

interface VehicleRow {
  id: string
  year: number
  make: string
  model: string
}

interface LocationRow {
  id: string
  name: string
}

function isAppointmentStatus(value: string | undefined): value is AppointmentStatusValue {
  if (!value) return false
  return Object.values(AppointmentStatus).includes(value as AppointmentStatusValue)
}

const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

export default async function AppointmentsPage(
  { searchParams }: { searchParams: Promise<{ status?: string; date?: string }> }
) {
  const { orgId: clerkOrgId } = await auth()
  if (!clerkOrgId) redirect('/')

  const params = await searchParams
  const orgId = await resolveOrgId(clerkOrgId)
  const db = await createProductAdminClient()

  let appointmentsQuery = db
    .from('appointments')
    .select('id, customer_id, vehicle_id, location_id, scheduled_at, duration, status, notes, service_type_names')
    .eq('org_id', orgId)
    .order('scheduled_at', { ascending: true })

  if (isAppointmentStatus(params.status)) {
    appointmentsQuery = appointmentsQuery.eq('status', params.status)
  }

  if (params.date) {
    const start = new Date(`${params.date}T00:00:00`)
    if (!Number.isNaN(start.getTime())) {
      const end = new Date(`${params.date}T23:59:59.999`)
      appointmentsQuery = appointmentsQuery
        .gte('scheduled_at', start.toISOString())
        .lte('scheduled_at', end.toISOString())
    }
  }

  const { data: appointmentRows, error: appointmentsError } = await appointmentsQuery
  assertSupabaseError(appointmentsError, 'Failed to fetch appointments')
  const appointments = (appointmentRows ?? []) as AppointmentRow[]

  const customerIds = Array.from(new Set(appointments.map((appt) => appt.customer_id)))
  const vehicleIds = Array.from(new Set(appointments.map((appt) => appt.vehicle_id).filter((id): id is string => Boolean(id))))
  const locationIds = Array.from(new Set(appointments.map((appt) => appt.location_id).filter((id): id is string => Boolean(id))))

  const [customersRes, vehiclesRes, locationsRes] = await Promise.all([
    customerIds.length > 0
      ? db.from('customers').select('id, first_name, last_name, phone').in('id', customerIds)
      : Promise.resolve({ data: [], error: null }),
    vehicleIds.length > 0
      ? db.from('vehicles').select('id, year, make, model').in('id', vehicleIds)
      : Promise.resolve({ data: [], error: null }),
    locationIds.length > 0
      ? db.from('locations').select('id, name').in('id', locationIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  assertSupabaseError(customersRes.error, 'Failed to fetch appointment customers')
  assertSupabaseError(vehiclesRes.error, 'Failed to fetch appointment vehicles')
  assertSupabaseError(locationsRes.error, 'Failed to fetch appointment locations')

  const customerById = new Map(((customersRes.data ?? []) as CustomerRow[]).map((customer) => [customer.id, customer]))
  const vehicleById = new Map(((vehiclesRes.data ?? []) as VehicleRow[]).map((vehicle) => [vehicle.id, vehicle]))
  const locationById = new Map(((locationsRes.data ?? []) as LocationRow[]).map((location) => [location.id, location]))

  const hydratedAppointments = appointments.flatMap((appt) => {
    const customer = customerById.get(appt.customer_id)
    if (!customer) return []
    return [{
      ...appt,
      scheduledAt: new Date(appt.scheduled_at),
      customer,
      vehicle: appt.vehicle_id ? vehicleById.get(appt.vehicle_id) ?? null : null,
      location: appt.location_id ? locationById.get(appt.location_id) ?? null : null,
      serviceTypeNames: appt.service_type_names ?? [],
    }]
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Appointments</h1>
          <p className="text-muted-foreground mt-1">Schedule and manage customer appointments</p>
        </div>
        <CreateAppointmentDialog />
      </div>
      {hydratedAppointments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No appointments</h3>
            <p className="text-muted-foreground mt-1 mb-4">Get started by scheduling your first appointment.</p>
            <CreateAppointmentDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">{hydratedAppointments.map((appt) => {
          const b = STATUS_CFG[appt.status]
          return (
            <Card key={appt.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {appt.customer.first_name} {appt.customer.last_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    {fmtDate(appt.scheduledAt)} &middot; {appt.duration} min
                  </p>
                </div>
                <Badge variant={b.variant} className={b.className}>{b.label}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {appt.vehicle && (
                  <p className="text-sm flex items-center gap-2">
                    <Car className="h-3.5 w-3.5 text-muted-foreground" />
                    {appt.vehicle.year} {appt.vehicle.make} {appt.vehicle.model}
                  </p>
                )}
                {appt.serviceTypeNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {appt.serviceTypeNames.map((service) => <Badge key={service} variant="outline" className="text-xs">{service}</Badge>)}
                  </div>
                )}
                {appt.location && <p className="text-xs text-muted-foreground">{appt.location.name}</p>}
                {appt.notes && <p className="text-sm text-muted-foreground italic">{appt.notes}</p>}
              </CardContent>
            </Card>
          )
        })}</div>
      )}
    </div>
  )
}
