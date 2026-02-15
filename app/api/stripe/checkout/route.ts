import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe, PLANS, PlanTier } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tier } = await request.json() as { tier: string }
    const plan = PLANS[tier as PlanTier]

    if (!plan || !plan.priceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const org = await prisma.organization.findUnique({
      where: { clerkOrgId: orgId },
    })

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Create or retrieve Stripe customer
    let stripeCustomerId = org.stripeCustomerId
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        metadata: { orgId, clerkOrgId: orgId },
        name: org.name,
      })
      stripeCustomerId = customer.id
      await prisma.organization.update({
        where: { clerkOrgId: orgId },
        data: { stripeCustomerId },
      })
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings`,
      metadata: { orgId, tier },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
