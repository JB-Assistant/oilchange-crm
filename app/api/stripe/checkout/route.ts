import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createProductAdminClient, createPlatformAdminClient, resolveOrgId } from '@/lib/supabase/server'
import { stripe, PLANS, PlanTier } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { tier } = await request.json() as { tier: string }
    const plan = PLANS[tier as PlanTier]
    if (!plan || !plan.priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const platform = await createPlatformAdminClient()

    const [shopRes, orgRes] = await Promise.all([
      db.from('shops').select('stripe_customer_id').eq('org_id', orgId).maybeSingle(),
      platform.from('orgs').select('name').eq('id', orgId).maybeSingle(),
    ])

    if (!shopRes.data) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    let stripeCustomerId = shopRes.data.stripe_customer_id
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        metadata: { orgId, clerkOrgId },
        name: orgRes.data?.name ?? '',
      })
      stripeCustomerId = customer.id
      await db.from('shops').update({ stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() }).eq('org_id', orgId)
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
    console.error('[stripe/checkout]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
