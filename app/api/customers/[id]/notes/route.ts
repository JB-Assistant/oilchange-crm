import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { assertSupabaseError } from '@/lib/supabase/otto'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'

async function verifyCustomerInOrg(db: Awaited<ReturnType<typeof createProductAdminClient>>, customerId: string, orgId: string) {
  const customerRes = await db
    .from('customers')
    .select('id')
    .eq('id', customerId)
    .eq('org_id', orgId)
    .maybeSingle()
  assertSupabaseError(customerRes.error, 'Failed to verify customer access')
  return Boolean(customerRes.data)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId: clerkOrgId } = await auth()
    if (!userId || !clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()

    const customerExists = await verifyCustomerInOrg(db, id, orgId)
    if (!customerExists) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const notesRes = await db
      .from('customer_notes')
      .select('*')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
    assertSupabaseError(notesRes.error, 'Failed to fetch customer notes')

    return NextResponse.json(notesRes.data ?? [])
  } catch (error) {
    console.error('[customers/notes] GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId: clerkOrgId } = await auth()
    if (!userId || !clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { body } = await req.json()

    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      return NextResponse.json({ error: 'Note body is required' }, { status: 400 })
    }

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()

    const customerExists = await verifyCustomerInOrg(db, id, orgId)
    if (!customerExists) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const now = new Date().toISOString()
    const noteRes = await db
      .from('customer_notes')
      .insert({
        id: crypto.randomUUID(),
        customer_id: id,
        org_id: orgId,
        body: body.trim(),
        created_by: userId,
        created_at: now,
      })
      .select('*')
      .single()
    assertSupabaseError(noteRes.error, 'Failed to create customer note')

    return NextResponse.json(noteRes.data, { status: 201 })
  } catch (error) {
    console.error('[customers/notes] POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
