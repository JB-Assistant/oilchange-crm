import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { userId, orgId: clerkOrgId } = await auth()
    if (!userId || !clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()

    const { data } = await db
      .from('reminder_templates')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    return NextResponse.json(data ?? [])
  } catch (error) {
    console.error('[reminder-templates] GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, orgId: clerkOrgId } = await auth()
    if (!userId || !clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, body, isDefault } = await req.json()
    if (!name || !body) return NextResponse.json({ error: 'Name and body are required' }, { status: 400 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()

    const { data: template, error } = await db
      .from('reminder_templates')
      .insert({ org_id: orgId, name, body, is_default: isDefault || false })
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('[reminder-templates] POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
