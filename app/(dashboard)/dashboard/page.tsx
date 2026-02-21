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
import { assertSupabaseError } from '@/lib/supabase/otto'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'

type DbClient = Awaited<ReturnType<typeof createProductAdminClient>>

interface CustomerRow {
  id: string
  first_name: string
  last_name: string
}

interface VehicleRow {
  id: string
  customer_id: string
  year: number
  make: string
  model: string
}

interface ServiceRow {
  id: string
  vehicle_id: string
  next_due_date: string
  next_due_mileage: number
}

async function countCustomers(db: DbClient, orgId: string, status?: CustomerStatus): Promise<number> {
  let query = db.from('customers').select('id', { count: 'exact' }).eq('org_id', orgId)
  if (status) query = query.eq('status', status)
  const { count, error } = await query.limit(1)
  assertSupabaseError(error, 'Failed to count customers')
  return count ?? 0
}

async function countRecentFollowUps(db: DbClient, orgId: string): Promise<number> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await db
    .from('follow_up_records')
    .select('id', { count: 'exact' })
    .eq('org_id', orgId)
    .gte('contact_date', since)
    .limit(1)
  assertSupabaseError(error, 'Failed to count recent follow-ups')
  return count ?? 0
}

async function getUpcomingServices(db: DbClient, orgId: string) {
  const { data: customerRows, error: customerError } = await db
    .from('customers')
    .select('id, first_name, last_name')
    .eq('org_id', orgId)

  assertSupabaseError(customerError, 'Failed to fetch customers for upcoming services')
  const customers = (customerRows ?? []) as CustomerRow[]
  if (customers.length === 0) return []

  const customerIds = customers.map((c) => c.id)
  const { data: vehicleRows, error: vehicleError } = await db
    .from('vehicles')
    .select('id, customer_id, year, make, model')
    .in('customer_id', customerIds)

  assertSupabaseError(vehicleError, 'Failed to fetch vehicles for upcoming services')
  const vehicles = (vehicleRows ?? []) as VehicleRow[]
  if (vehicles.length === 0) return []

  const vehicleIds = vehicles.map((v) => v.id)
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: serviceRows, error: serviceError } = await db
    .from('repair_orders')
    .select('id, vehicle_id, next_due_date, next_due_mileage')
    .in('vehicle_id', vehicleIds)
    .lte('next_due_date', nextMonth)
    .order('next_due_date', { ascending: true })
    .limit(20)

  assertSupabaseError(serviceError, 'Failed to fetch upcoming services')
  const services = (serviceRows ?? []) as ServiceRow[]

  const customerById = new Map(customers.map((c) => [c.id, c]))
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]))

  return services
    .flatMap((service) => {
      const vehicle = vehicleById.get(service.vehicle_id)
      if (!vehicle) return []
      const customer = customerById.get(vehicle.customer_id)
      if (!customer) return []

      return [{
        id: service.id,
        nextDueDate: new Date(service.next_due_date),
        nextDueMileage: service.next_due_mileage,
        vehicle: {
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          customer: {
            firstName: customer.first_name,
            lastName: customer.last_name,
          },
        },
      }]
    })
    .slice(0, 5)
}

export default async function DashboardPage() {
  const { orgId: clerkOrgId } = await auth()
  if (!clerkOrgId) redirect('/')

  let hadLoadError = false

  let totalCustomers = 0
  let overdueCount = 0
  let dueNowCount = 0
  let dueSoonCount = 0
  let upToDateCount = 0
  let recentFollowUps = 0
  let upcomingServices: Awaited<ReturnType<typeof getUpcomingServices>> = []

  try {
    const db = await createProductAdminClient()
    const orgId = await resolveOrgId(clerkOrgId)
    ;[
      totalCustomers,
      overdueCount,
      dueNowCount,
      dueSoonCount,
      upToDateCount,
      recentFollowUps,
      upcomingServices,
    ] = await Promise.all([
      countCustomers(db, orgId),
      countCustomers(db, orgId, CustomerStatus.overdue),
      countCustomers(db, orgId, CustomerStatus.due_now),
      countCustomers(db, orgId, CustomerStatus.due_soon),
      countCustomers(db, orgId, CustomerStatus.up_to_date),
      countRecentFollowUps(db, orgId),
      getUpcomingServices(db, orgId),
    ])
  } catch (error) {
    hadLoadError = true
    console.error('[dashboard/page] Failed to load dashboard data:', error)
  }

  const conversionRate = totalCustomers > 0 ? Math.round((upToDateCount / totalCustomers) * 100) : 0

  return (
    <div className="space-y-8">
      {hadLoadError && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 text-sm">
          Dashboard data could not be loaded completely. Showing fallback values.
        </div>
      )}
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
