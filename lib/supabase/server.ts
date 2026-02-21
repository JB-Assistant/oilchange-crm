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
