// lib/supabase/clients.ts
// ============================================================
// UNIFIED AI VERTICAL PLATFORM — Browser Clients
//
// Architecture:
//   - One Supabase project, five schemas
//   - public schema = platform layer (orgs, members, user_apps)
//   - Each app client is schema-scoped
//   - Auth is shared across all products
//   - org_id is the security boundary on every table
//
// Rules:
//   ✅ Always query within your app's schema client
//   ✅ Always pass org_id when inserting data
//   ❌ Never mix schemas in a single query
//   ❌ Never bypass org_id
//   ❌ Never grant anon write access
// ============================================================

import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ─────────────────────────────────────────
// Factory — schema-scoped browser client
// ─────────────────────────────────────────
function createAppClient(schema: string) {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON, {
    db: { schema },
  })
}

// ─────────────────────────────────────────
// Platform client — public schema
// Use for: orgs, org_members, user_apps
// ─────────────────────────────────────────
export const platformClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

// ─────────────────────────────────────────
// Product clients — schema-scoped
// Import only the client relevant to your app
// ─────────────────────────────────────────

/** CleanBuddyPro → cleanbuddy schema */
export const cleanbuddyClient = createAppClient('cleanbuddy')

/** OttoManagerPro → otto schema */
export const ottoClient = createAppClient('otto')

/** TireManagerPro V2 → tire_v2 schema */
export const tireClient = createAppClient('tire_v2')

/** FieldAgent AI → fieldagent_ai schema */
export const fieldagentClient = createAppClient('fieldagent_ai')

/** OttoManagerPro V2 → otto_v2 schema */
export const ottoV2Client = createAppClient('otto_v2')


// ─────────────────────────────────────────
// Platform helpers (browser-safe)
// ─────────────────────────────────────────

/**
 * Get all orgs the current user belongs to.
 * Use in nav/sidebar to show org switcher.
 */
export async function getUserOrgs() {
  const { data, error } = await platformClient
    .from('org_members')
    .select('org_id, role, orgs(id, name, slug, industry, plan)')
  if (error) throw error
  return data
}

/**
 * Get the current user's role in a specific org.
 */
export async function getUserRoleInOrg(orgId: string) {
  const { data, error } = await platformClient
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .single()
  if (error) throw error
  return data?.role ?? null
}

/**
 * Get which apps a user has access to.
 * Use to determine which product links to show in unified nav.
 */
export async function getUserApps(userId: string) {
  const { data, error } = await platformClient
    .from('user_apps')
    .select('app, org_id')
    .eq('user_id', userId)
  if (error) throw error
  return data
}
