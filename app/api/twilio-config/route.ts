import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'
import { encrypt, decrypt, isEncrypted } from '@/lib/crypto'

export async function GET() {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()

    const { data: config } = await db
      .from('twilio_configs')
      .select('id, account_sid, phone_number, is_active')
      .eq('org_id', orgId)
      .maybeSingle()

    if (!config) return NextResponse.json(null)

    const displaySid = isEncrypted(config.account_sid) ? decrypt(config.account_sid) : config.account_sid
    return NextResponse.json({ id: config.id, accountSid: displaySid, phoneNumber: config.phone_number, isActive: config.is_active })
  } catch (error) {
    console.error('[twilio-config] GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountSid, authToken, phoneNumber } = await req.json()
    if (!accountSid || !authToken || !phoneNumber) {
      return NextResponse.json({ error: 'Account SID, Auth Token, and Phone Number are required' }, { status: 400 })
    }

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const now = new Date().toISOString()

    const { data, error } = await db
      .from('twilio_configs')
      .upsert(
        { org_id: orgId, account_sid: encrypt(accountSid), auth_token: encrypt(authToken), phone_number: phoneNumber, is_active: true, updated_at: now },
        { onConflict: 'org_id' }
      )
      .select('id, phone_number, is_active')
      .single()

    if (error) throw error
    return NextResponse.json({ id: data.id, phoneNumber: data.phone_number, isActive: data.is_active })
  } catch (error) {
    console.error('[twilio-config] POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
