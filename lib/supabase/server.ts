// lib/supabase/server.ts
// ============================================================
// UNIFIED AI VERTICAL PLATFORM — Server-Side Clients
//
// Copy this file into each app and set APP_SCHEMA.
// The platform client (public schema) is always available
// alongside the product client for org resolution.
//
// Rules:
//   ✅ Use productClient for all product data queries
//   ✅ Use platformClient for org/member/user_apps lookups
//   ✅ Always resolve org_id before inserting product data
//   ❌ Never mix schemas in a single query
//   ❌ Never bypass org_id checks
// ============================================================

import { createServerClient } from '@supabase/ssr'
import { type PostgrestError } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// ─── SET THIS PER APP ────────────────────────────────────────
// cleanbuddy | otto | tire_v2 | fieldagent_ai | otto_v2
const APP_SCHEMA = 'otto'
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────
// Product client — schema-scoped (authenticated user)
// Use for all product data: jobs, vehicles, dispatches, etc.
// ─────────────────────────────────────────
export async function createProductClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: APP_SCHEMA },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* Server Component — cookies set by middleware */ }
        },
      },
    }
  )
}

// ─────────────────────────────────────────
// Platform client — public schema (authenticated user)
// Use for: orgs, org_members, user_apps lookups
// ─────────────────────────────────────────
export async function createPlatformClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // No db.schema override = uses public schema
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* Server Component */ }
        },
      },
    }
  )
}

// ─────────────────────────────────────────
// Admin product client — service role, schema-scoped
// Use for: server-side mutations, AI agent operations
// NEVER expose to browser
// ─────────────────────────────────────────
export async function createProductAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: APP_SCHEMA },
      cookies: { getAll: () => [], setAll: () => {} },
    }
  )
}

// ─────────────────────────────────────────
// Admin platform client — service role, public schema
// Use for: org provisioning, user tagging, AI cross-schema ops
// NEVER expose to browser
// ─────────────────────────────────────────
export async function createPlatformAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    }
  )
}


// ─────────────────────────────────────────
// Server-side platform helpers
// ─────────────────────────────────────────

type PlatformAdminClient = Awaited<ReturnType<typeof createPlatformAdminClient>>

function isMissingClerkOrgIdColumn(error: PostgrestError | null): boolean {
  if (!error) return false
  const haystack = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase()
  return (
    /could not find.+clerk_org_id.+column/.test(haystack) ||
    /clerk_org_id.*does not exist/.test(haystack)
  )
}

function isUniqueViolation(error: PostgrestError | null): boolean {
  return error?.code === '23505'
}

async function findOrgBySlug(platform: PlatformAdminClient, slug: string) {
  const { data, error } = await platform
    .from('orgs')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw new Error(`Failed to resolve org by slug fallback: ${error.message}`)
  return data
}

/**
 * Resolve the Supabase UUID org_id from a Clerk org ID string.
 * Call this at the top of every Server Component and API route
 * that needs to query product data (otto schema).
 *
 * Uses public.orgs.clerk_org_id when available.
 * Falls back to slug-based lookup in legacy schemas where that column
 * hasn't been applied yet.
 *
 * Usage:
 *   const { orgId: clerkOrgId } = await auth()
 *   const orgId = await resolveOrgId(clerkOrgId)  // UUID
 */
export async function resolveOrgId(clerkOrgId: string): Promise<string> {
  const platform = await createPlatformAdminClient()

  // Fast path: already provisioned via Clerk bridge column
  const { data: existing, error: existingError } = await platform
    .from('orgs')
    .select('id')
    .eq('clerk_org_id', clerkOrgId)
    .maybeSingle()

  const canUseClerkBridge = !isMissingClerkOrgIdColumn(existingError)

  if (existingError && canUseClerkBridge) {
    throw new Error(`Failed to resolve org: ${existingError.message}`)
  }

  if (existing) return existing.id

  // Legacy fallback when clerk_org_id column is unavailable.
  if (!canUseClerkBridge) {
    const legacyOrg = await findOrgBySlug(platform, clerkOrgId)
    if (legacyOrg) return legacyOrg.id
  }

  // Auto-provision: org exists in Clerk but not yet in Supabase
  const baseOrg = { name: clerkOrgId, slug: clerkOrgId, plan: 'trial' as const }
  const insertPayload = canUseClerkBridge
    ? { ...baseOrg, clerk_org_id: clerkOrgId }
    : baseOrg

  let { data: newOrg, error: orgError } = await platform
    .from('orgs')
    .insert(insertPayload)
    .select('id')
    .single()

  // PostgREST schema cache can be stale even when migrations were run.
  // Retry once without the bridge column so users can continue.
  if (canUseClerkBridge && isMissingClerkOrgIdColumn(orgError)) {
    const retry = await platform
      .from('orgs')
      .insert(baseOrg)
      .select('id')
      .single()

    newOrg = retry.data
    orgError = retry.error
  }

  if (isUniqueViolation(orgError)) {
    const existingBySlug = await findOrgBySlug(platform, clerkOrgId)
    if (existingBySlug) {
      newOrg = existingBySlug
      orgError = null
    }
  }

  if (orgError || !newOrg) throw new Error(`Failed to auto-provision org: ${orgError?.message}`)

  const db = await createProductAdminClient()
  const { error: shopError } = await db
    .from('shops')
    .upsert(
      {
        org_id: newOrg.id,
        name: clerkOrgId,
        subscription_status: 'trial',
        subscription_tier: 'starter',
      },
      { onConflict: 'org_id' }
    )

  if (shopError) throw new Error(`Failed to provision shop: ${shopError.message}`)

  return newOrg.id
}

/**
 * Resolve the active org_id for the current user.
 * Call this at the top of Server Components / API routes
 * before any product data queries.
 *
 * Usage:
 *   const { userId, orgId, role } = await resolveUserOrg(request)
 */
export async function resolveUserOrg(userId: string, orgId?: string) {
  const platform = await createPlatformClient()

  const query = platform
    .from('org_members')
    .select('org_id, role, orgs(id, name, slug, plan)')
    .eq('user_id', userId)

  if (orgId) query.eq('org_id', orgId)

  const { data, error } = await query.limit(1).single()
  if (error || !data) throw new Error('User is not a member of any org')

  return {
    userId,
    orgId:  data.org_id,
    role:   data.role,
    org:    data.orgs,
  }
}
