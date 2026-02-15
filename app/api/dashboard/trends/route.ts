import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '90')
    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Customer growth: monthly counts
    const customers = await prisma.customer.findMany({
      where: { orgId, createdAt: { gte: dateFrom } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    // Service records: monthly counts by type
    const services = await prisma.serviceRecord.findMany({
      where: {
        vehicle: { customer: { orgId } },
        serviceDate: { gte: dateFrom },
      },
      select: { serviceDate: true, serviceType: true },
      orderBy: { serviceDate: 'asc' },
    })

    // SMS messages: monthly counts by status
    const messages = await prisma.reminderMessage.findMany({
      where: { orgId, createdAt: { gte: dateFrom } },
      select: { createdAt: true, status: true, direction: true },
      orderBy: { createdAt: 'asc' },
    })

    // Aggregate into monthly buckets
    const customerGrowth = aggregateByMonth(customers.map(c => c.createdAt))
    const servicesByMonth = aggregateByMonth(services.map(s => s.serviceDate))
    const smsByMonth = aggregateByMonth(messages.map(m => m.createdAt))

    // Service type distribution
    const serviceTypeCounts: Record<string, number> = {}
    for (const s of services) {
      const type = s.serviceType.replace(/_/g, ' ')
      serviceTypeCounts[type] = (serviceTypeCounts[type] || 0) + 1
    }

    // SMS delivery stats
    const smsStats = {
      delivered: messages.filter(m => m.status === 'delivered').length,
      sent: messages.filter(m => m.status === 'sent').length,
      failed: messages.filter(m => m.status === 'failed').length,
      queued: messages.filter(m => m.status === 'queued').length,
    }

    // Status distribution (current snapshot)
    const statusCounts = await prisma.customer.groupBy({
      by: ['status'],
      where: { orgId },
      _count: true,
    })

    return NextResponse.json({
      customerGrowth,
      servicesByMonth,
      smsByMonth,
      serviceTypeCounts,
      smsStats,
      statusDistribution: statusCounts.map(s => ({
        status: s.status,
        count: s._count,
      })),
    })
  } catch (error) {
    console.error('Error fetching trends:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function aggregateByMonth(dates: Date[]): { month: string; count: number }[] {
  const buckets: Record<string, number> = {}
  for (const date of dates) {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    buckets[key] = (buckets[key] || 0) + 1
  }
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }))
}
