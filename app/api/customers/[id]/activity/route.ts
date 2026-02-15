import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface ActivityItem {
  id: string
  type: 'service' | 'follow_up' | 'reminder' | 'consent' | 'note'
  title: string
  description: string
  date: Date
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const customer = await prisma.customer.findFirst({
      where: { id, orgId },
    })
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Fetch all activity types in parallel
    const [services, followUps, reminders, consents, notes] = await Promise.all([
      prisma.serviceRecord.findMany({
        where: { vehicle: { customerId: id } },
        include: { vehicle: true },
        orderBy: { serviceDate: 'desc' },
        take: 50,
      }),
      prisma.followUpRecord.findMany({
        where: { customerId: id },
        include: { serviceRecord: { include: { vehicle: true } } },
        orderBy: { contactDate: 'desc' },
        take: 50,
      }),
      prisma.reminderMessage.findMany({
        where: { customerId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.consentLog.findMany({
        where: { customerId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.customerNote.findMany({
        where: { customerId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    const activity: ActivityItem[] = []

    for (const s of services) {
      activity.push({
        id: s.id,
        type: 'service',
        title: `${s.serviceType.replace(/_/g, ' ')} service`,
        description: `${s.vehicle.year} ${s.vehicle.make} ${s.vehicle.model} at ${s.mileageAtService.toLocaleString()} mi`,
        date: s.serviceDate,
      })
    }

    for (const f of followUps) {
      activity.push({
        id: f.id,
        type: 'follow_up',
        title: `Follow-up (${f.method})`,
        description: `${f.outcome.replace(/_/g, ' ')}${f.notes ? ` — ${f.notes}` : ''}`,
        date: f.contactDate,
      })
    }

    for (const r of reminders) {
      activity.push({
        id: r.id,
        type: 'reminder',
        title: `SMS ${r.direction === 'inbound' ? 'received' : 'sent'}`,
        description: r.body.slice(0, 100) + (r.body.length > 100 ? '...' : ''),
        date: r.sentAt || r.scheduledAt,
      })
    }

    for (const c of consents) {
      activity.push({
        id: c.id,
        type: 'consent',
        title: c.action === 'opt_in' ? 'SMS opt-in' : 'SMS opt-out',
        description: `Via ${c.source.replace(/_/g, ' ')}`,
        date: c.createdAt,
      })
    }

    for (const n of notes) {
      activity.push({
        id: n.id,
        type: 'note',
        title: 'Note added',
        description: n.body.slice(0, 100) + (n.body.length > 100 ? '...' : ''),
        date: n.createdAt,
      })
    }

    // Sort all activity by date, newest first
    activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json(activity.slice(0, 100))
  } catch (error) {
    console.error('Error fetching activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
