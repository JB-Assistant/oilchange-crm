import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { userId, orgId: clerkOrgId } = await auth()
    if (!userId || !clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { customerId } = await params
    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()

    const { data: logs } = await db
      .from('consent_logs')
      .select('*')
      .eq('customer_id', customerId)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    return NextResponse.json(logs ?? [])
  } catch (error) {
    console.error('[consent] GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { userId, orgId: clerkOrgId } = await auth()
    if (!userId || !clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { customerId } = await params
    const { action } = await req.json()

    if (!action || !['opt_in', 'opt_out'].includes(action)) {
      return NextResponse.json({ error: "Action must be 'opt_in' or 'opt_out'" }, { status: 400 })
    }

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const now = new Date().toISOString()

    await db
      .from('customers')
      .update({ sms_consent: action === 'opt_in', sms_consent_date: now, updated_at: now })
      .eq('id', customerId)
      .eq('org_id', orgId)

    await db.from('consent_logs').insert({
      org_id: orgId,
      customer_id: customerId,
      action,
      source: 'manual',
      performed_by: userId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[consent] POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
