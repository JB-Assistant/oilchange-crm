// lib/supabase/auth.ts
// ============================================================
// UNIFIED AI VERTICAL PLATFORM — Auth & Org Provisioning
//
// Handles:
//   - User signup → org creation → app tagging
//   - User login → org resolution
//   - Cross-app user verification
//   - Auth callback route pattern
//
// Uses service role (admin) for all user/org mutations.
// ============================================================

import { createClient } from '@supabase/supabase-js'

export type AppName = 'cleanbuddy' | 'otto' | 'tire_v2' | 'fieldagent_ai' | 'otto_v2'
export type OrgRole = 'owner' | 'manager' | 'tech'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)


// ─────────────────────────────────────────
// ONBOARDING — called after first signup
// Creates org, adds user as owner, registers app access
// ─────────────────────────────────────────

/**
 * Full onboarding flow for a new user.
 * Call this in the auth callback after email confirmation.
 *
 * Usage:
 *   await provisionNewUser({
 *     userId: user.id,
 *     orgName: 'Sunshine Cleaning Co',
 *     app: 'cleanbuddy',
 *     industry: 'cleaning',
 *   })
 */
export async function provisionNewUser({
  userId,
  orgName,
  app,
  industry,
}: {
  userId:   string
  orgName:  string
  app:      AppName
  industry?: string
}) {
  // 1. Create the org
  const { data: org, error: orgError } = await supabaseAdmin
    .from('orgs')
    .insert({
      name:     orgName,
      slug:     slugify(orgName),
      industry: industry ?? appToIndustry(app),
      plan:     'trial',
    })
    .select()
    .single()

  if (orgError) throw orgError

  // 2. Add user as owner
  const { error: memberError } = await supabaseAdmin
    .from('org_members')
    .insert({ org_id: org.id, user_id: userId, role: 'owner' })

  if (memberError) throw memberError

  // 3. Register app access
  const { error: appError } = await supabaseAdmin
    .from('user_apps')
    .insert({ user_id: userId, app, org_id: org.id })

  if (appError) throw appError

  // 4. Tag app in auth.users metadata (for fast middleware checks)
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { app, org_id: org.id },
  })

  return { org, userId, app }
}


// ─────────────────────────────────────────
// INVITE — add existing or new user to an org
// ─────────────────────────────────────────

/**
 * Add a user to an existing org with a given role.
 * Call from owner/manager dashboard to invite team members.
 */
export async function addOrgMember({
  orgId,
  userId,
  role = 'tech',
  app,
}: {
  orgId:  string
  userId: string
  role?:  OrgRole
  app:    AppName
}) {
  const { error: memberError } = await supabaseAdmin
    .from('org_members')
    .upsert({ org_id: orgId, user_id: userId, role }, { onConflict: 'org_id,user_id' })

  if (memberError) throw memberError

  const { error: appError } = await supabaseAdmin
    .from('user_apps')
    .upsert({ user_id: userId, app, org_id: orgId }, { onConflict: 'user_id,app' })

  if (appError) throw appError
}


// ─────────────────────────────────────────
// LOOKUP — resolve user's org and app access
// ─────────────────────────────────────────

/**
 * Get which app a user belongs to (from auth metadata — fast).
 * Use in middleware for route protection.
 */
export async function getUserApp(userId: string): Promise<AppName | null> {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId)
  return (data?.user?.app_metadata?.app as AppName) ?? null
}

/**
 * Get the user's org_id (from auth metadata — fast).
 * Use in middleware or API routes.
 */
export async function getUserOrgId(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId)
  return data?.user?.app_metadata?.org_id ?? null
}

/**
 * Full org membership lookup (from database — authoritative).
 * Use in server components when you need role + org details.
 */
export async function getUserOrgMembership(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('org_members')
    .select('org_id, role, orgs(id, name, slug, plan, industry)')
    .eq('user_id', userId)

  if (error) throw error
  return data
}

/**
 * Verify user belongs to a specific app.
 * Use in middleware to enforce app boundaries.
 */
export async function verifyUserApp(
  userId: string,
  expectedApp: AppName
): Promise<boolean> {
  const app = await getUserApp(userId)
  return app === expectedApp
}


// ─────────────────────────────────────────
// AUTH CALLBACK ROUTE TEMPLATE
// Copy into: apps/[app-name]/app/auth/callback/route.ts
// Change APP and INDUSTRY per product
// ─────────────────────────────────────────
//
// import { createProductClient } from '@/lib/supabase/server'
// import { provisionNewUser }    from '@/lib/supabase/auth'
// import { NextResponse }        from 'next/server'
//
// const APP      = 'cleanbuddy'   // ← change per app
// const INDUSTRY = 'cleaning'     // ← change per app
//
// export async function GET(request: Request) {
//   const { searchParams, origin } = new URL(request.url)
//   const code = searchParams.get('code')
//   const orgName = searchParams.get('org_name') ?? 'My Business'
//
//   if (code) {
//     const supabase = await createProductClient()
//     const { data } = await supabase.auth.exchangeCodeForSession(code)
//
//     if (data?.user) {
//       // Check if already onboarded
//       const existing = await supabase
//         .from('user_apps')
//         .select('id')
//         .eq('user_id', data.user.id)
//         .eq('app', APP)
//         .maybeSingle()
//
//       // First time — provision org + membership
//       if (!existing?.data) {
//         await provisionNewUser({
//           userId:   data.user.id,
//           orgName,
//           app:      APP,
//           industry: INDUSTRY,
//         })
//       }
//     }
//   }
//
//   return NextResponse.redirect(new URL('/dashboard', origin))
// }


// ─────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────
function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function appToIndustry(app: AppName): string {
  const map: Record<AppName, string> = {
    cleanbuddy:    'cleaning',
    otto:          'auto',
    tire_v2:       'tire',
    fieldagent_ai: 'field_service',
    otto_v2:       'auto',
  }
  return map[app]
}
