import { createProductAdminClient } from '@/lib/supabase/server'
import { getPlanLimits } from './stripe'

interface LimitCheck {
  allowed: boolean
  current: number
  limit: number
  message?: string
}

export async function checkCustomerLimit(orgId: string): Promise<LimitCheck> {
  const db = await createProductAdminClient()

  const { data: shop } = await db
    .from('shops')
    .select('subscription_tier')
    .eq('org_id', orgId)
    .maybeSingle()

  const tier = shop?.subscription_tier || 'starter'
  const limits = getPlanLimits(tier)

  const { count } = await db
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)

  const current = count ?? 0

  if (current >= limits.customers) {
    return {
      allowed: false,
      current,
      limit: limits.customers,
      message: `You've reached the ${limits.customers} customer limit on your ${tier} plan. Upgrade to add more.`,
    }
  }

  return { allowed: true, current, limit: limits.customers }
}

export async function checkSmsLimit(orgId: string): Promise<LimitCheck> {
  const db = await createProductAdminClient()

  const { data: shop } = await db
    .from('shops')
    .select('subscription_tier')
    .eq('org_id', orgId)
    .maybeSingle()

  const tier = shop?.subscription_tier || 'starter'
  const limits = getPlanLimits(tier)

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count } = await db
    .from('reminder_messages')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('direction', 'outbound')
    .gte('created_at', startOfMonth.toISOString())
    .in('status', ['sent', 'delivered', 'queued'])

  const current = count ?? 0

  if (current >= limits.smsPerMonth) {
    return {
      allowed: false,
      current,
      limit: limits.smsPerMonth,
      message: `You've reached the ${limits.smsPerMonth} SMS/month limit on your ${tier} plan. Upgrade for more.`,
    }
  }

  return { allowed: true, current, limit: limits.smsPerMonth }
}
