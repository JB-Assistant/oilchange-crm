import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { assertSupabaseError } from '@/lib/supabase/otto'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'

interface CustomerTagRow {
  id: string
  tags: string[] | null
}

async function getCustomerForTags(db: Awaited<ReturnType<typeof createProductAdminClient>>, id: string, orgId: string): Promise<CustomerTagRow | null> {
  const customerRes = await db
    .from('customers')
    .select('id, tags')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle()
  assertSupabaseError(customerRes.error, 'Failed to fetch customer tags')
  return customerRes.data as CustomerTagRow | null
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId: clerkOrgId } = await auth()
    if (!userId || !clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { tag } = await req.json()

    if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
      return NextResponse.json({ error: 'Tag is required' }, { status: 400 })
    }

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()

    const customer = await getCustomerForTags(db, id, orgId)
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const currentTags = customer.tags ?? []
    const normalizedTag = tag.trim().toLowerCase()
    if (currentTags.includes(normalizedTag)) {
      return NextResponse.json({ error: 'Tag already exists' }, { status: 400 })
    }

    const nextTags = [...currentTags, normalizedTag]
    const updateRes = await db
      .from('customers')
      .update({ tags: nextTags, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', orgId)
      .select('tags')
      .single()
    assertSupabaseError(updateRes.error, 'Failed to add customer tag')

    return NextResponse.json({ tags: updateRes.data?.tags ?? nextTags })
  } catch (error) {
    console.error('[customers/tags] POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId: clerkOrgId } = await auth()
    if (!userId || !clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const tag = searchParams.get('tag')

    if (!tag) return NextResponse.json({ error: 'Tag is required' }, { status: 400 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()

    const customer = await getCustomerForTags(db, id, orgId)
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const nextTags = (customer.tags ?? []).filter(t => t !== tag)
    const updateRes = await db
      .from('customers')
      .update({ tags: nextTags, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', orgId)
      .select('tags')
      .single()
    assertSupabaseError(updateRes.error, 'Failed to remove customer tag')

    return NextResponse.json({ tags: updateRes.data?.tags ?? nextTags })
  } catch (error) {
    console.error('[customers/tags] DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
