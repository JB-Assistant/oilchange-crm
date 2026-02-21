import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'
import { encrypt, decrypt, isEncrypted } from '@/lib/crypto'

const VALID_PROVIDERS = ['anthropic', 'openai', 'google'] as const

function maskApiKey(apiKey: string): string {
  const raw = isEncrypted(apiKey) ? decrypt(apiKey) : apiKey
  if (raw.length <= 4) return '****'
  return '****' + raw.slice(-4)
}

export async function GET() {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()

    const { data: config } = await db
      .from('ai_configs')
      .select('id, provider, model, api_key, is_active, created_at, updated_at')
      .eq('org_id', orgId)
      .maybeSingle()

    if (!config) return NextResponse.json(null)

    return NextResponse.json({
      id: config.id,
      provider: config.provider,
      model: config.model,
      apiKey: maskApiKey(config.api_key),
      isActive: config.is_active,
      createdAt: config.created_at,
      updatedAt: config.updated_at,
    })
  } catch (error) {
    console.error('[ai-config] GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { provider, model, apiKey } = await req.json()

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: 'Provider must be one of: anthropic, openai, google' }, { status: 400 })
    }
    if (!model || typeof model !== 'string' || model.trim() === '') {
      return NextResponse.json({ error: 'Model is required' }, { status: 400 })
    }

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const now = new Date().toISOString()

    const { data: existing } = await db.from('ai_configs').select('id, api_key').eq('org_id', orgId).maybeSingle()
    const hasNewApiKey = apiKey && typeof apiKey === 'string' && apiKey.trim() !== ''

    if (!existing && !hasNewApiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }

    const encryptedKey = hasNewApiKey ? encrypt(apiKey.trim()) : existing?.api_key

    const { data: config, error } = await db
      .from('ai_configs')
      .upsert(
        { org_id: orgId, provider, model: model.trim(), api_key: encryptedKey!, is_active: true, updated_at: now },
        { onConflict: 'org_id' }
      )
      .select('id, provider, model, api_key, is_active, created_at, updated_at')
      .single()

    if (error) throw error

    return NextResponse.json({
      id: config.id,
      provider: config.provider,
      model: config.model,
      apiKey: maskApiKey(config.api_key),
      isActive: config.is_active,
      createdAt: config.created_at,
      updatedAt: config.updated_at,
    })
  } catch (error) {
    console.error('[ai-config] POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()

    await db.from('ai_configs').delete().eq('org_id', orgId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ai-config] DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
