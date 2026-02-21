import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { assertSupabaseError, getOttoClient } from '@/lib/supabase/otto'

async function verifyCustomerInOrg(customerId: string, orgId: string) {
  const db = getOttoClient()
  const customerRes = await db
    .from('customers')
    .select('id')
    .eq('id', customerId)
    .eq('orgId', orgId)
    .maybeSingle()

  assertSupabaseError(customerRes.error, 'Failed to verify customer access')
  return Boolean(customerRes.data)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const customerExists = await verifyCustomerInOrg(id, orgId)
    if (!customerExists) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const db = getOttoClient()
    const notesRes = await db
      .from('customer_notes')
      .select('*')
      .eq('customerId', id)
      .order('createdAt', { ascending: false })

    assertSupabaseError(notesRes.error, 'Failed to fetch customer notes')
    return NextResponse.json(notesRes.data ?? [])
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { body } = await req.json()

    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      return NextResponse.json({ error: 'Note body is required' }, { status: 400 })
    }

    const customerExists = await verifyCustomerInOrg(id, orgId)
    if (!customerExists) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const db = getOttoClient()
    const now = new Date().toISOString()
    const noteRes = await db
      .from('customer_notes')
      .insert({
        id: crypto.randomUUID(),
        customerId: id,
        body: body.trim(),
        createdBy: userId,
        createdAt: now,
      })
      .select('*')
      .single()

    assertSupabaseError(noteRes.error, 'Failed to create customer note')
    return NextResponse.json(noteRes.data, { status: 201 })
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
