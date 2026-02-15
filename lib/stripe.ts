import Stripe from 'stripe'

function createStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    // Return a proxy that throws clear errors when Stripe is used without a key
    return new Proxy({} as Stripe, {
      get(_, prop) {
        if (prop === 'webhooks') {
          return {
            constructEvent: () => {
              throw new Error('STRIPE_SECRET_KEY is not configured')
            },
          }
        }
        throw new Error('STRIPE_SECRET_KEY is not configured')
      },
    })
  }
  return new Stripe(key, { apiVersion: '2026-01-28.clover' })
}

export const stripe = createStripeClient()

export const PLANS = {
  starter: {
    name: 'Starter',
    price: 0,
    priceId: null,
    limits: { customers: 100, smsPerMonth: 200 },
  },
  professional: {
    name: 'Professional',
    price: 4900, // cents
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || null,
    limits: { customers: 1000, smsPerMonth: 2000 },
  },
  enterprise: {
    name: 'Enterprise',
    price: 14900, // cents
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || null,
    limits: { customers: Infinity, smsPerMonth: Infinity },
  },
} as const

export type PlanTier = keyof typeof PLANS

export function getPlanLimits(tier: string) {
  return PLANS[tier as PlanTier]?.limits || PLANS.starter.limits
}
