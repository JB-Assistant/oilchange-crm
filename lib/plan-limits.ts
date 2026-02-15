import { prisma } from './prisma'
import { getPlanLimits } from './stripe'

interface LimitCheck {
  allowed: boolean
  current: number
  limit: number
  message?: string
}

export async function checkCustomerLimit(orgId: string): Promise<LimitCheck> {
  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
  })

  const tier = org?.subscriptionTier || 'starter'
  const limits = getPlanLimits(tier)
  const current = await prisma.customer.count({ where: { orgId } })

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
  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
  })

  const tier = org?.subscriptionTier || 'starter'
  const limits = getPlanLimits(tier)

  // Count SMS sent this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const current = await prisma.reminderMessage.count({
    where: {
      orgId,
      direction: 'outbound',
      createdAt: { gte: startOfMonth },
      status: { in: ['sent', 'delivered', 'queued'] },
    },
  })

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
