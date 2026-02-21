import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'
import { ensureOrganization } from '@/lib/ensure-org'

const VALID_TONES = ['friendly', 'professional', 'casual'] as const

export async function GET() {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await ensureOrganization(clerkOrgId)
    const db = await createProductAdminClient()

    const { data: shop } = await db
      .from('shops')
      .select('ai_personalization, ai_tone')
      .eq('org_id', orgId)
      .maybeSingle()

    if (!shop) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    return NextResponse.json({ aiPersonalization: shop.ai_personalization, aiTone: shop.ai_tone })
  } catch (error) {
    console.error('[settings/ai] GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { aiPersonalization, aiTone } = await req.json()

    if (typeof aiPersonalization !== 'boolean') {
      return NextResponse.json({ error: 'aiPersonalization must be a boolean' }, { status: 400 })
    }
    if (aiTone && !VALID_TONES.includes(aiTone)) {
      return NextResponse.json({ error: `aiTone must be one of: ${VALID_TONES.join(', ')}` }, { status: 400 })
    }

    const orgId = await ensureOrganization(clerkOrgId)
    const db = await createProductAdminClient()

    await db
      .from('shops')
      .update({ ai_personalization: aiPersonalization, ...(aiTone ? { ai_tone: aiTone } : {}), updated_at: new Date().toISOString() })
      .eq('org_id', orgId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[settings/ai] POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
