import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { CustomerStatus } from '@/lib/db/enums'
import { assertSupabaseError, getOttoClient } from '@/lib/supabase/otto'

async function countCustomers(orgId: string, status?: CustomerStatus): Promise<number> {
  const db = getOttoClient()
  let query = db.from('customers').select('id', { count: 'exact', head: true }).eq('orgId', orgId)
  if (status) query = query.eq('status', status)
  const { count, error } = await query
  assertSupabaseError(error, 'Failed to count customers')
  return count ?? 0
}

async function countFollowUps(orgId: string, since?: string, outcome?: string): Promise<number> {
  const db = getOttoClient()
  let query = db.from('follow_up_records').select('id', { count: 'exact', head: true }).eq('orgId', orgId)
  if (since) query = query.gte('contactDate', since)
  if (outcome) query = query.eq('outcome', outcome)
  const { count, error } = await query
  assertSupabaseError(error, 'Failed to count follow-up records')
  return count ?? 0
}

export async function GET() {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recentFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [
      totalCustomers,
      overdueCount,
      dueNowCount,
      dueSoonCount,
      upToDateCount,
      recentFollowUps,
      totalFollowUps,
      scheduledCount,
    ] = await Promise.all([
      countCustomers(orgId),
      countCustomers(orgId, CustomerStatus.overdue),
      countCustomers(orgId, CustomerStatus.due_now),
      countCustomers(orgId, CustomerStatus.due_soon),
      countCustomers(orgId, CustomerStatus.up_to_date),
      countFollowUps(orgId, recentFrom),
      countFollowUps(orgId),
      countFollowUps(orgId, undefined, 'scheduled'),
    ])

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
      conversionRate,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}
