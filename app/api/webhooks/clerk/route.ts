import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createPlatformAdminClient, createProductAdminClient } from '@/lib/supabase/server'
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

  const wh = new Webhook(webhookSecret)

  try {
    wh.verify(JSON.stringify(payload), {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const { type, data } = payload

  try {
    const platform = await createPlatformAdminClient()

    switch (type) {
      case 'organization.created': {
        // 1. Create public.orgs row (platform level)
        const { data: newOrg, error: orgError } = await platform
          .from('orgs')
          .insert({
            name: data.name,
            slug: data.slug || data.id,
            plan: 'trial',
            clerk_org_id: data.id,
          })
          .select('id')
          .single()

        if (orgError || !newOrg) {
          console.error('[clerk-webhook] Failed to create org:', orgError)
          return NextResponse.json({ error: 'Failed to create org' }, { status: 500 })
        }

        // 2. Create otto.shops row (product level)
        const db = await createProductAdminClient()
        await db.from('shops').insert({
          org_id: newOrg.id,
          name: data.name,
          subscription_status: 'trial',
          subscription_tier: 'starter',
        })

        // 3. Seed default service types, templates, reminder rules
        await seedOrgDefaults(newOrg.id)
        break
      }

      case 'organization.updated': {
        await platform
          .from('orgs')
          .update({ name: data.name, slug: data.slug || data.id })
          .eq('clerk_org_id', data.id)
        break
      }

      case 'organization.deleted': {
        // Cascade deletes all otto.* rows via FK constraints
        await platform
          .from('orgs')
          .delete()
          .eq('clerk_org_id', data.id)
        break
      }

      case 'organizationMembership.created': {
        const { data: org } = await platform
          .from('orgs')
          .select('id')
          .eq('clerk_org_id', data.organization.id)
          .single()

        if (org) {
          await platform
            .from('org_members')
            .upsert(
              { org_id: org.id, user_id: data.public_user_data.user_id, role: data.role.toLowerCase() },
              { onConflict: 'org_id,user_id' }
            )
        }
        break
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[clerk-webhook] Error:', error)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}
