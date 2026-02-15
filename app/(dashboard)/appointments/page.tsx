export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AppointmentStatus, Prisma } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, User, Car } from 'lucide-react'
import { CreateAppointmentDialog } from '@/components/appointments/create-appointment-dialog'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'
const STATUS_CFG: Record<AppointmentStatus, { label: string; variant: BadgeVariant; className?: string }> = {
  scheduled: { label: 'Scheduled', variant: 'secondary', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  confirmed: { label: 'Confirmed', variant: 'secondary', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  in_progress: { label: 'In Progress', variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  completed: { label: 'Completed', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  no_show: { label: 'No Show', variant: 'outline' },
}

const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

export default async function AppointmentsPage(
  { searchParams }: { searchParams: Promise<{ status?: string; date?: string }> }
) {
  const { orgId } = await auth()
  if (!orgId) redirect('/')
  const params = await searchParams
  const where: Prisma.AppointmentWhereInput = { orgId }
  if (params.status && params.status in STATUS_CFG) where.status = params.status as AppointmentStatus
  if (params.date) {
    const d = new Date(params.date + 'T00:00:00')
    if (!isNaN(d.getTime())) where.scheduledAt = { gte: d, lte: new Date(params.date + 'T23:59:59.999') }
  }
  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      customer: { select: { firstName: true, lastName: true, phone: true } },
      vehicle: { select: { year: true, make: true, model: true } },
      location: { select: { name: true } },
    },
    orderBy: { scheduledAt: 'asc' },
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
      {appointments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No appointments</h3>
            <p className="text-muted-foreground mt-1 mb-4">Get started by scheduling your first appointment.</p>
            <CreateAppointmentDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">{appointments.map((appt) => {
          const b = STATUS_CFG[appt.status]
          return (
            <Card key={appt.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {appt.customer.firstName} {appt.customer.lastName}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    {fmtDate(appt.scheduledAt)} &middot; {appt.duration} min
                  </p>
                </div>
                <Badge variant={b.variant} className={b.className}>{b.label}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {appt.vehicle && (<p className="text-sm flex items-center gap-2">
                  <Car className="h-3.5 w-3.5 text-muted-foreground" />
                  {appt.vehicle.year} {appt.vehicle.make} {appt.vehicle.model}
                </p>)}
                {appt.serviceTypeNames.length > 0 && (<div className="flex flex-wrap gap-1.5">
                  {appt.serviceTypeNames.map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                </div>)}
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
