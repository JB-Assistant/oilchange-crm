import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId = session.metadata?.orgId
        const tier = session.metadata?.tier
        if (orgId && tier) {
          await prisma.organization.update({
            where: { clerkOrgId: orgId },
            data: {
              subscriptionStatus: 'active',
              subscriptionTier: tier,
              stripeSubscriptionId: session.subscription as string,
            },
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const org = await prisma.organization.findUnique({
          where: { stripeCustomerId: subscription.customer as string },
        })
        if (org) {
          await prisma.organization.update({
            where: { clerkOrgId: org.clerkOrgId },
            data: {
              subscriptionStatus: subscription.status === 'active' ? 'active' : subscription.status,
              ...(subscription.items.data[0]?.current_period_end && {
                currentPeriodEnd: new Date(subscription.items.data[0].current_period_end * 1000),
              }),
            },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const org = await prisma.organization.findUnique({
          where: { stripeCustomerId: subscription.customer as string },
        })
        if (org) {
          await prisma.organization.update({
            where: { clerkOrgId: org.clerkOrgId },
            data: {
              subscriptionStatus: 'canceled',
              subscriptionTier: 'starter',
              stripeSubscriptionId: null,
              stripePriceId: null,
            },
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const org = await prisma.organization.findUnique({
          where: { stripeCustomerId: invoice.customer as string },
        })
        if (org) {
          await prisma.organization.update({
            where: { clerkOrgId: org.clerkOrgId },
            data: { subscriptionStatus: 'past_due' },
          })
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing Stripe webhook:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
