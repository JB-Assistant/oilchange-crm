import { createPlatformAdminClient, createProductAdminClient } from '@/lib/supabase/server'
import { seedOrgDefaults } from './seed-defaults'

/**
 * Ensures an org record exists in public.orgs for the given Clerk org ID.
 * Auto-provisions if the Clerk webhook hasn't fired yet (common in dev).
 * Returns the UUID org_id.
 */
export async function ensureOrganization(clerkOrgId: string): Promise<string> {
  const platform = await createPlatformAdminClient()

  const { data: existing } = await platform
    .from('orgs')
    .select('id')
    .eq('clerk_org_id', clerkOrgId)
    .maybeSingle()

  if (existing) return existing.id

  // Auto-provision (webhook missed)
  const { data: newOrg, error } = await platform
    .from('orgs')
    .insert({
      name: clerkOrgId,
      slug: clerkOrgId,
      plan: 'trial',
      clerk_org_id: clerkOrgId,
    })
    .select('id')
    .single()

  if (error || !newOrg) throw new Error(`Failed to auto-provision org: ${error?.message}`)

  const db = await createProductAdminClient()
  await db.from('shops').insert({
    org_id: newOrg.id,
    name: clerkOrgId,
    subscription_status: 'trial',
    subscription_tier: 'starter',
  })

  await seedOrgDefaults(newOrg.id)
  return newOrg.id
}
