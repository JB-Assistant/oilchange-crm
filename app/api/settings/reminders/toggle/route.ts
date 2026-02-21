import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { enabled } = await req.json()
    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()

    await db.from('shops').update({ reminder_enabled: enabled, updated_at: new Date().toISOString() }).eq('org_id', orgId)
    return NextResponse.json({ success: true, enabled })
  } catch (error) {
    console.error('[settings/reminders/toggle]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
