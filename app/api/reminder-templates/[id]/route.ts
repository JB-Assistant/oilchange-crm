import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId: clerkOrgId } = await auth()
    if (!userId || !clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()

    const { data, error } = await db
      .from('reminder_templates')
      .update(body)
      .eq('id', id)
      .eq('org_id', orgId)
      .select('*')
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (error) {
    console.error('[reminder-templates/[id]] PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId: clerkOrgId } = await auth()
    if (!userId || !clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()

    const { error } = await db
      .from('reminder_templates')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[reminder-templates/[id]] DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
