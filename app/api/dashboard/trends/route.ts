import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { assertSupabaseError, getOttoClient } from '@/lib/supabase/otto'

interface DateRow {
  createdAt: string
}

interface ServiceRow {
  serviceDate: string
  serviceType: string
}

interface MessageRow {
  createdAt: string
  status: string
}

interface StatusRow {
  status: string
}

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getOttoClient()
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '90', 10)
    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const [customersRes, messagesRes, statusRes, customerIdsRes] = await Promise.all([
      db
        .from('customers')
        .select('createdAt')
        .eq('orgId', orgId)
        .gte('createdAt', dateFrom)
        .order('createdAt', { ascending: true }),
      db
        .from('reminder_messages')
        .select('createdAt, status')
        .eq('orgId', orgId)
        .gte('createdAt', dateFrom)
        .order('createdAt', { ascending: true }),
      db
        .from('customers')
        .select('status')
        .eq('orgId', orgId),
      db
        .from('customers')
        .select('id')
        .eq('orgId', orgId),
    ])

    assertSupabaseError(customersRes.error, 'Failed to fetch customers trend')
    assertSupabaseError(messagesRes.error, 'Failed to fetch message trend')
    assertSupabaseError(statusRes.error, 'Failed to fetch status distribution')
    assertSupabaseError(customerIdsRes.error, 'Failed to fetch customers for services trend')

    const customerIds = (customerIdsRes.data ?? []).map((row) => row.id as string)
    let services: ServiceRow[] = []

    if (customerIds.length > 0) {
      const { data: vehicles, error: vehiclesError } = await db
        .from('vehicles')
        .select('id')
        .in('customerId', customerIds)
      assertSupabaseError(vehiclesError, 'Failed to fetch vehicles for services trend')

      const vehicleIds = (vehicles ?? []).map((row) => row.id as string)
      if (vehicleIds.length > 0) {
        const servicesRes = await db
          .from('service_records')
          .select('serviceDate, serviceType')
          .in('vehicleId', vehicleIds)
          .gte('serviceDate', dateFrom)
          .order('serviceDate', { ascending: true })

        assertSupabaseError(servicesRes.error, 'Failed to fetch services trend')
        services = (servicesRes.data ?? []) as ServiceRow[]
      }
    }

    const customers = (customersRes.data ?? []) as DateRow[]
    const messages = (messagesRes.data ?? []) as MessageRow[]
    const statuses = (statusRes.data ?? []) as StatusRow[]

    const customerGrowth = aggregateByMonth(customers.map((c) => c.createdAt))
    const servicesByMonth = aggregateByMonth(services.map((s) => s.serviceDate))
    const smsByMonth = aggregateByMonth(messages.map((m) => m.createdAt))

    const serviceTypeCounts: Record<string, number> = {}
    for (const service of services) {
      const type = service.serviceType.replace(/_/g, ' ')
      serviceTypeCounts[type] = (serviceTypeCounts[type] || 0) + 1
    }

    const smsStats = {
      delivered: messages.filter((m) => m.status === 'delivered').length,
      sent: messages.filter((m) => m.status === 'sent').length,
      failed: messages.filter((m) => m.status === 'failed').length,
      queued: messages.filter((m) => m.status === 'queued').length,
    }

    const statusMap = new Map<string, number>()
    for (const row of statuses) {
      statusMap.set(row.status, (statusMap.get(row.status) || 0) + 1)
    }

    return NextResponse.json({
      customerGrowth,
      servicesByMonth,
      smsByMonth,
      serviceTypeCounts,
      smsStats,
      statusDistribution: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
    })
  } catch (error) {
    console.error('Error fetching trends:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function aggregateByMonth(dates: string[]): { month: string; count: number }[] {
  const buckets: Record<string, number> = {}
  for (const dateValue of dates) {
    const date = new Date(dateValue)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    buckets[key] = (buckets[key] || 0) + 1
  }

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }))
}
