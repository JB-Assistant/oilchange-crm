import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { assertSupabaseError } from '@/lib/supabase/otto'
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
      .from('service_types')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', orgId)
      .select('*')
      .maybeSingle()
    assertSupabaseError(error, 'Failed to update service type')

    if (!data) return NextResponse.json({ error: 'Service type not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (error) {
    console.error('[service-types/[id]] PATCH:', error)
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
      .from('service_types')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)
    assertSupabaseError(error, 'Failed to delete service type')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[service-types/[id]] DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
