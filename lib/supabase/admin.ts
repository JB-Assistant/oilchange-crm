// lib/supabase/admin.ts
// ============================================================
// UNIFIED AI VERTICAL PLATFORM — Admin & AI Agent Client
//
// This file is for:
//   - AI agent cross-schema queries (FieldAgent AI reading otto + tire_v2)
//   - Server-side org provisioning
//   - Background jobs / cron tasks
//   - Webhook handlers
//
// SECURITY RULES:
//   ✅ Always scope queries by org_id
//   ✅ Only use in server-side code (API routes, edge functions)
//   ❌ Never import this file in client components
//   ❌ Never expose SUPABASE_SERVICE_ROLE_KEY to the browser
//   ❌ Never bypass org_id — even with service role
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────
// Base admin client — no schema override (public)
// Use for org/member operations
// ─────────────────────────────────────────
export const adminClient: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

// ─────────────────────────────────────────
// Schema-scoped admin clients
// Use for direct product schema operations
// ─────────────────────────────────────────
export const cleanbuddyAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'cleanbuddy' }, auth: { persistSession: false } }
)

export const ottoAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'otto' }, auth: { persistSession: false } }
)

export const tireAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'tire_v2' }, auth: { persistSession: false } }
)

export const fieldagentAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'fieldagent_ai' }, auth: { persistSession: false } }
)

export const ottoV2Admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'otto_v2' }, auth: { persistSession: false } }
)


// ============================================================
// AI AGENT OPERATIONS
// FieldAgent AI can safely read across schemas via org_id.
// Because everything shares the same database, these are
// simple cross-schema joins — no API hops required.
// ============================================================

/**
 * AI Agent: Get full org context for dispatch decision-making.
 * Reads repair orders (otto) + tire inventory (tire_v2) for an org.
 *
 * Usage in FieldAgent AI dispatch engine:
 *   const context = await getOrgContextForAI(orgId)
 */
export async function getOrgContextForAI(orgId: string) {
  // Parallel cross-schema queries — same DB, no API hops
  const [repairOrders, tireInventory, openDispatches] = await Promise.all([
    // Open repair orders from OttoManagerPro
    ottoAdmin
      .from('repair_orders')
      .select('id, status, description, total_cost, vehicles(year, make, model)')
      .eq('org_id', orgId)
      .in('status', ['open', 'in_progress'])
      .limit(20),

    // Low-stock tire inventory from TireManagerPro
    tireAdmin
      .from('inventory')
      .select('brand, model, size, type, quantity')
      .eq('org_id', orgId)
      .lt('quantity', 5)
      .order('quantity', { ascending: true })
      .limit(20),

    // Pending dispatches for this org
    fieldagentAdmin
      .from('dispatches')
      .select('id, priority, status, issue, customer_name, agents(name, status)')
      .eq('org_id', orgId)
      .in('status', ['pending', 'assigned'])
      .order('priority', { ascending: false })
      .limit(20),
  ])

  return {
    orgId,
    repairOrders:   repairOrders.data   ?? [],
    tireInventory:  tireInventory.data  ?? [],
    openDispatches: openDispatches.data ?? [],
  }
}

/**
 * AI Agent: Log an AI interaction with full audit trail.
 * Always called after an AI response is generated.
 */
export async function logAIInteraction({
  orgId,
  companyId,
  dispatchId,
  type,
  inputText,
  aiResponse,
  tokensUsed,
}: {
  orgId:       string
  companyId:   string
  dispatchId?: string
  type:        'inbound_call' | 'customer_sms' | 'agent_update'
  inputText:   string
  aiResponse:  string
  tokensUsed:  number
}) {
  const { error } = await fieldagentAdmin
    .from('ai_interactions')
    .insert({
      org_id:      orgId,
      company_id:  companyId,
      dispatch_id: dispatchId,
      type,
      input_text:  inputText,
      ai_response: aiResponse,
      tokens_used: tokensUsed,
    })

  if (error) throw error
}

/**
 * Platform Admin: Create a new org programmatically.
 * Use in onboarding API routes or admin tools.
 */
export async function createOrg({
  name,
  industry,
  ownerId,
}: {
  name:     string
  industry: string
  ownerId:  string
}) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  const { data: org, error } = await adminClient
    .from('orgs')
    .insert({ name, slug, industry, plan: 'trial' })
    .select()
    .single()

  if (error) throw error

  // Add creator as owner
  await adminClient
    .from('org_members')
    .insert({ org_id: org.id, user_id: ownerId, role: 'owner' })

  return org
}
