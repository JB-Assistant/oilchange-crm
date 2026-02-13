export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CustomerStatus } from '@prisma/client'
import { 
  Users, 
  AlertCircle, 
  Calendar, 
  Clock, 
  CheckCircle2,
  TrendingUp,
  Phone
} from 'lucide-react'
import { StatusBadge } from '@/components/status-badge'
import { format } from '@/lib/format'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const { orgId } = await auth()
  
  if (!orgId) {
    redirect('/')
  }

  // Get all stats
  const [
    totalCustomers,
    overdueCount,
    dueNowCount,
    dueSoonCount,
    upToDateCount,
    recentFollowUps,
    upcomingServices
  ] = await Promise.all([
    prisma.customer.count({ where: { orgId } }),
    prisma.customer.count({ where: { orgId, status: CustomerStatus.overdue } }),
    prisma.customer.count({ where: { orgId, status: CustomerStatus.due_now } }),
    prisma.customer.count({ where: { orgId, status: CustomerStatus.due_soon } }),
    prisma.customer.count({ where: { orgId, status: CustomerStatus.up_to_date } }),
    prisma.followUpRecord.count({ 
      where: { 
        orgId,
        contactDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      } 
    }),
    prisma.serviceRecord.findMany({
      where: {
        vehicle: { customer: { orgId } },
        nextDueDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
      },
      include: {
        vehicle: {
          include: {
            customer: true
          }
        }
      },
      orderBy: { nextDueDate: 'asc' },
      take: 5
    })
  ])

  const conversionRate = totalCustomers > 0 
    ? Math.round((upToDateCount / totalCustomers) * 100) 
    : 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your customer service status</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Customers"
          value={totalCustomers}
          icon={<Users className="w-4 h-4" />}
          trend="+12% from last month"
        />
        <StatCard
          title="Overdue Services"
          value={overdueCount}
          icon={<AlertCircle className="w-4 h-4 text-red-500" />}
          alert
        />
        <StatCard
          title="Due This Week"
          value={dueNowCount}
          icon={<Clock className="w-4 h-4 text-orange-500" />}
        />
        <StatCard
          title="Retention Rate"
          value={`${conversionRate}%`}
          icon={<TrendingUp className="w-4 h-4 text-green-500" />}
        />
      </div>

      {/* Status Breakdown */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          title="Overdue"
          count={overdueCount}
          status={CustomerStatus.overdue}
          href="/customers?status=overdue"
        />
        <StatusCard
          title="Due Now"
          count={dueNowCount}
          status={CustomerStatus.due_now}
          href="/customers?status=due_now"
        />
        <StatusCard
          title="Due Soon"
          count={dueSoonCount}
          status={CustomerStatus.due_soon}
          href="/customers?status=due_soon"
        />
        <StatusCard
          title="Up to Date"
          count={upToDateCount}
          status={CustomerStatus.up_to_date}
          href="/customers?status=up_to_date"
        />
      </div>

      {/* Recent Activity & Upcoming */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Upcoming Services */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Services (Next 30 Days)
            </CardTitle>
            <Link href="/customers">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingServices.length === 0 ? (
              <p className="text-zinc-600 text-center py-8">No upcoming services in the next 30 days</p>
            ) : (
              <div className="space-y-4">
                {upcomingServices.map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                    <div>
                      <p className="font-medium">
                        {service.vehicle.customer.firstName} {service.vehicle.customer.lastName}
                      </p>
                      <p className="text-sm text-zinc-600">
                        {service.vehicle.year} {service.vehicle.make} {service.vehicle.model}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{format.date(service.nextDueDate)}</p>
                      <p className="text-sm text-zinc-600">{service.nextDueMileage.toLocaleString()} mi</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Link href="/customers">
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                  <Users className="w-6 h-6" />
                  <span>View Customers</span>
                </Button>
              </Link>
              <Link href="/import">
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                  <TrendingUp className="w-6 h-6" />
                  <span>Import Data</span>
                </Button>
              </Link>
            </div>
            <div className="p-4 bg-zinc-50 rounded-lg">
              <p className="font-medium mb-2">This Week's Activity</p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-2xl font-bold">{recentFollowUps}</p>
                  <p className="text-sm text-zinc-600">Follow-ups logged</p>
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold">{overdueCount + dueNowCount}</p>
                  <p className="text-sm text-zinc-600">Need attention</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ 
  title, 
  value, 
  icon, 
  trend,
  alert 
}: { 
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: string
  alert?: boolean
}) {
  return (
    <Card className={alert && value > 0 ? 'border-red-200' : ''}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-600">{title}</p>
            <p className={`text-3xl font-bold mt-2 ${alert && value > 0 ? 'text-red-600' : ''}`}>
              {value}
            </p>
            {trend && <p className="text-xs text-zinc-500 mt-1">{trend}</p>}
          </div>
          <div className="p-3 bg-zinc-100 rounded-full">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusCard({ 
  title, 
  count, 
  status, 
  href 
}: { 
  title: string
  count: number
  status: CustomerStatus
  href: string
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-zinc-300 transition-colors cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-600">{title}</p>
              <p className="text-3xl font-bold mt-2">{count}</p>
            </div>
            <StatusBadge status={status} />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
