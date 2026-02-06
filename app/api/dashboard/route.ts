import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CustomerStatus } from '@prisma/client'

export async function GET() {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [
      totalCustomers,
      overdueCount,
      dueNowCount,
      dueSoonCount,
      upToDateCount,
      recentFollowUps,
      totalFollowUps
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
      prisma.followUpRecord.count({ where: { orgId } })
    ])

    // Calculate conversion rate (customers who scheduled after follow-up)
    const scheduledCount = await prisma.followUpRecord.count({
      where: {
        orgId,
        outcome: 'scheduled'
      }
    })

    const conversionRate = totalFollowUps > 0 
      ? Math.round((scheduledCount / totalFollowUps) * 100) 
      : 0

    return NextResponse.json({
      totalCustomers,
      overdue: overdueCount,
      dueNow: dueNowCount,
      dueSoon: dueSoonCount,
      upToDate: upToDateCount,
      recentFollowUps,
      conversionRate
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}
