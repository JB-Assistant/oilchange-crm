import { NextRequest, NextResponse } from 'next/server'
import { createProductAdminClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    const db = await createProductAdminClient()
    const now = new Date().toISOString()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId = session.metadata?.orgId
        const tier = session.metadata?.tier
        if (orgId && tier) {
          await db.from('shops').update({
            subscription_status: 'active',
            subscription_tier: tier,
            stripe_subscription_id: session.subscription as string,
            updated_at: now,
          }).eq('org_id', orgId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const { data: shop } = await db
          .from('shops')
          .select('org_id')
          .eq('stripe_customer_id', subscription.customer as string)
          .maybeSingle()

        if (shop) {
          await db.from('shops').update({
            subscription_status: subscription.status === 'active' ? 'active' : subscription.status,
            updated_at: now,
          }).eq('org_id', shop.org_id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const { data: shop } = await db
          .from('shops')
          .select('org_id')
          .eq('stripe_customer_id', subscription.customer as string)
          .maybeSingle()

        if (shop) {
          await db.from('shops').update({
            subscription_status: 'canceled',
            subscription_tier: 'starter',
            stripe_subscription_id: null,
            updated_at: now,
          }).eq('org_id', shop.org_id)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const { data: shop } = await db
          .from('shops')
          .select('org_id')
          .eq('stripe_customer_id', invoice.customer as string)
          .maybeSingle()

        if (shop) {
          await db.from('shops').update({ subscription_status: 'past_due', updated_at: now }).eq('org_id', shop.org_id)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[stripe-webhook] Handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
