export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Users, AlertCircle, Clock, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { StatusCard } from '@/components/dashboard/status-card'
import { UpcomingServices } from '@/components/dashboard/upcoming-services'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import { CustomerStatus } from '@/lib/db/enums'
import { assertSupabaseError, getOttoClient } from '@/lib/supabase/otto'

interface CustomerRow {
  id: string
  firstName: string
  lastName: string
}

interface VehicleRow {
  id: string
  customerId: string
  year: number
  make: string
  model: string
}

interface ServiceRow {
  id: string
  vehicleId: string
  nextDueDate: string
  nextDueMileage: number
}

async function countCustomers(orgId: string, status?: CustomerStatus): Promise<number> {
  const db = getOttoClient()
  let query = db.from('customers').select('id', { count: 'exact', head: true }).eq('orgId', orgId)
  if (status) query = query.eq('status', status)
  const { count, error } = await query
  assertSupabaseError(error, 'Failed to count customers')
  return count ?? 0
}

async function countRecentFollowUps(orgId: string): Promise<number> {
  const db = getOttoClient()
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await db
    .from('follow_up_records')
    .select('id', { count: 'exact', head: true })
    .eq('orgId', orgId)
    .gte('contactDate', since)
  assertSupabaseError(error, 'Failed to count recent follow-ups')
  return count ?? 0
}

async function getUpcomingServices(orgId: string) {
  const db = getOttoClient()

  const { data: customerRows, error: customerError } = await db
    .from('customers')
    .select('id, firstName, lastName')
    .eq('orgId', orgId)

  assertSupabaseError(customerError, 'Failed to fetch customers for upcoming services')
  const customers = (customerRows ?? []) as CustomerRow[]
  if (customers.length === 0) return []

  const customerIds = customers.map((c) => c.id)
  const { data: vehicleRows, error: vehicleError } = await db
    .from('vehicles')
    .select('id, customerId, year, make, model')
    .in('customerId', customerIds)

  assertSupabaseError(vehicleError, 'Failed to fetch vehicles for upcoming services')
  const vehicles = (vehicleRows ?? []) as VehicleRow[]
  if (vehicles.length === 0) return []

  const vehicleIds = vehicles.map((v) => v.id)
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: serviceRows, error: serviceError } = await db
    .from('service_records')
    .select('id, vehicleId, nextDueDate, nextDueMileage')
    .in('vehicleId', vehicleIds)
    .lte('nextDueDate', nextMonth)
    .order('nextDueDate', { ascending: true })
    .limit(20)

  assertSupabaseError(serviceError, 'Failed to fetch upcoming services')
  const services = (serviceRows ?? []) as ServiceRow[]

  const customerById = new Map(customers.map((c) => [c.id, c]))
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]))

  return services
    .flatMap((service) => {
      const vehicle = vehicleById.get(service.vehicleId)
      if (!vehicle) return []
      const customer = customerById.get(vehicle.customerId)
      if (!customer) return []

      return [{
        id: service.id,
        nextDueDate: new Date(service.nextDueDate),
        nextDueMileage: service.nextDueMileage,
        vehicle: {
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          customer: {
            firstName: customer.firstName,
            lastName: customer.lastName,
          },
        },
      }]
    })
    .slice(0, 5)
}

export default async function DashboardPage() {
  const { orgId } = await auth()
  if (!orgId) redirect('/')

  const [totalCustomers, overdueCount, dueNowCount, dueSoonCount, upToDateCount, recentFollowUps, upcomingServices] = await Promise.all([
    countCustomers(orgId),
    countCustomers(orgId, CustomerStatus.overdue),
    countCustomers(orgId, CustomerStatus.due_now),
    countCustomers(orgId, CustomerStatus.due_soon),
    countCustomers(orgId, CustomerStatus.up_to_date),
    countRecentFollowUps(orgId),
    getUpcomingServices(orgId),
  ])

  const conversionRate = totalCustomers > 0 ? Math.round((upToDateCount / totalCustomers) * 100) : 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your customer service status</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Customers" value={totalCustomers} icon={<Users className="w-4 h-4" />} trend="+12% from last month" />
        <StatCard title="Overdue Services" value={overdueCount} icon={<AlertCircle className="w-4 h-4 text-red-500" />} alert />
        <StatCard title="Due This Week" value={dueNowCount} icon={<Clock className="w-4 h-4 text-orange-500" />} />
        <StatCard title="Retention Rate" value={`${conversionRate}%`} icon={<TrendingUp className="w-4 h-4 text-green-500" />} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatusCard title="Overdue" count={overdueCount} status={CustomerStatus.overdue} href="/customers?status=overdue" />
        <StatusCard title="Due Now" count={dueNowCount} status={CustomerStatus.due_now} href="/customers?status=due_now" />
        <StatusCard title="Due Soon" count={dueSoonCount} status={CustomerStatus.due_soon} href="/customers?status=due_soon" />
        <StatusCard title="Up to Date" count={upToDateCount} status={CustomerStatus.up_to_date} href="/customers?status=up_to_date" />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <UpcomingServices services={upcomingServices} />
        <QuickActions recentFollowUps={recentFollowUps} needAttention={overdueCount + dueNowCount} />
      </div>

      <DashboardCharts />
    </div>
  )
}
