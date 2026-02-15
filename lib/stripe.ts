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
    name: 'Otto Starter',
    price: 4900, // cents
    priceId: process.env.STRIPE_STARTER_PRICE_ID || null,
    limits: { customers: 200, smsPerMonth: 300, locations: 1 },
  },
  pro: {
    name: 'Otto Pro',
    price: 9900, // cents
    priceId: process.env.STRIPE_PRO_PRICE_ID || null,
    limits: { customers: Infinity, smsPerMonth: 1000, locations: 3 },
  },
  business: {
    name: 'Otto Business',
    price: 19900, // cents
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID || null,
    limits: { customers: Infinity, smsPerMonth: 3000, locations: Infinity },
  },
} as const

export const SMS_OVERAGE_RATE = 0.04

export const TRIAL_CONFIG = {
  durationDays: 14,
  smsLimit: 50,
  tier: 'pro' as const,
}

export type PlanTier = keyof typeof PLANS

export function getPlanLimits(tier: string) {
  return PLANS[tier as PlanTier]?.limits || PLANS.starter.limits
}
