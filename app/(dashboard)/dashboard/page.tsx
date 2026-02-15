export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { CustomerStatus } from '@prisma/client'
import { Users, AlertCircle, Clock, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { StatusCard } from '@/components/dashboard/status-card'
import { UpcomingServices } from '@/components/dashboard/upcoming-services'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'

export default async function DashboardPage() {
  const { orgId } = await auth()
  if (!orgId) redirect('/')

  const [totalCustomers, overdueCount, dueNowCount, dueSoonCount, upToDateCount, recentFollowUps, upcomingServices] = await Promise.all([
    prisma.customer.count({ where: { orgId } }),
    prisma.customer.count({ where: { orgId, status: CustomerStatus.overdue } }),
    prisma.customer.count({ where: { orgId, status: CustomerStatus.due_now } }),
    prisma.customer.count({ where: { orgId, status: CustomerStatus.due_soon } }),
    prisma.customer.count({ where: { orgId, status: CustomerStatus.up_to_date } }),
    prisma.followUpRecord.count({
      where: { orgId, contactDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
    }),
    prisma.serviceRecord.findMany({
      where: {
        vehicle: { customer: { orgId } },
        nextDueDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
      },
      include: { vehicle: { include: { customer: true } } },
      orderBy: { nextDueDate: 'asc' },
      take: 5
    })
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
