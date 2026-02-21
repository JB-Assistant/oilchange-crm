import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { CustomerStatus } from '@/lib/db/enums'
import { assertSupabaseError } from '@/lib/supabase/otto'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'

async function countCustomers(db: Awaited<ReturnType<typeof createProductAdminClient>>, orgId: string, status?: CustomerStatus): Promise<number> {
  let query = db.from('customers').select('id', { count: 'exact', head: true }).eq('org_id', orgId)
  if (status) query = query.eq('status', status)
  const { count, error } = await query
  assertSupabaseError(error, 'Failed to count customers')
  return count ?? 0
}

async function countFollowUps(db: Awaited<ReturnType<typeof createProductAdminClient>>, orgId: string, since?: string, outcome?: string): Promise<number> {
  let query = db.from('follow_up_records').select('id', { count: 'exact', head: true }).eq('org_id', orgId)
  if (since) query = query.gte('contact_date', since)
  if (outcome) query = query.eq('outcome', outcome)
  const { count, error } = await query
  assertSupabaseError(error, 'Failed to count follow-up records')
  return count ?? 0
}

export async function GET() {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const recentFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [
      totalCustomers, overdueCount, dueNowCount, dueSoonCount, upToDateCount,
      recentFollowUps, totalFollowUps, scheduledCount,
    ] = await Promise.all([
      countCustomers(db, orgId),
      countCustomers(db, orgId, CustomerStatus.overdue),
      countCustomers(db, orgId, CustomerStatus.due_now),
      countCustomers(db, orgId, CustomerStatus.due_soon),
      countCustomers(db, orgId, CustomerStatus.up_to_date),
      countFollowUps(db, orgId, recentFrom),
      countFollowUps(db, orgId),
      countFollowUps(db, orgId, undefined, 'scheduled'),
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
    console.error('[dashboard]:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}
