import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { seedOrgDefaults } from '@/lib/seed-defaults'

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || ''

export async function POST(req: NextRequest) {
  const payload = await req.json()
  const headerList = await headers()
  
  const svix_id = headerList.get('svix-id')
  const svix_timestamp = headerList.get('svix-timestamp')
  const svix_signature = headerList.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  // Verify webhook signature
  const wh = new Webhook(webhookSecret)
  
  try {
    wh.verify(JSON.stringify(payload), {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const { type, data } = payload

  try {
    switch (type) {
      case 'organization.created':
        await prisma.organization.create({
          data: {
            clerkOrgId: data.id,
            name: data.name,
            slug: data.slug || data.id,
            subscriptionStatus: 'trial',
            subscriptionTier: 'starter',
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
          }
        })
        await seedOrgDefaults(data.id)
        break

      case 'organization.updated':
        await prisma.organization.update({
          where: { clerkOrgId: data.id },
          data: {
            name: data.name,
            slug: data.slug
          }
        })
        break

      case 'organization.deleted':
        await prisma.organization.delete({
          where: { clerkOrgId: data.id }
        })
        break
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}
