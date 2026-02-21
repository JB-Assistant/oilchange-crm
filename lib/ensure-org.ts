import { resolveOrgId } from '@/lib/supabase/server'
import { seedOrgDefaults } from './seed-defaults'

/**
 * Ensures an org record exists in public.orgs for the given Clerk org ID.
 * Auto-provisions if the Clerk webhook hasn't fired yet (common in dev).
 * Returns the UUID org_id.
 */
export async function ensureOrganization(clerkOrgId: string): Promise<string> {
  const orgId = await resolveOrgId(clerkOrgId)
  await seedOrgDefaults(orgId)
  return orgId
}
