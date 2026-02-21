import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { assertSupabaseError, getOttoClient } from '@/lib/supabase/otto'

interface CustomerTagRow {
  id: string
  tags: string[] | null
}

async function getCustomerForTags(id: string, orgId: string): Promise<CustomerTagRow | null> {
  const db = getOttoClient()
  const customerRes = await db
    .from('customers')
    .select('id, tags')
    .eq('id', id)
    .eq('orgId', orgId)
    .maybeSingle()
  assertSupabaseError(customerRes.error, 'Failed to fetch customer tags')
  return customerRes.data as CustomerTagRow | null
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
    const { tag } = await req.json()

    if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
      return NextResponse.json({ error: 'Tag is required' }, { status: 400 })
    }

    const customer = await getCustomerForTags(id, orgId)
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const currentTags = customer.tags ?? []
    const normalizedTag = tag.trim().toLowerCase()
    if (currentTags.includes(normalizedTag)) {
      return NextResponse.json({ error: 'Tag already exists' }, { status: 400 })
    }

    const nextTags = [...currentTags, normalizedTag]
    const db = getOttoClient()
    const updateRes = await db
      .from('customers')
      .update({ tags: nextTags, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('orgId', orgId)
      .select('tags')
      .single()

    assertSupabaseError(updateRes.error, 'Failed to add customer tag')
    return NextResponse.json({ tags: updateRes.data?.tags ?? nextTags })
  } catch (error) {
    console.error('Error adding tag:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const tag = searchParams.get('tag')

    if (!tag) {
      return NextResponse.json({ error: 'Tag is required' }, { status: 400 })
    }

    const customer = await getCustomerForTags(id, orgId)
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const nextTags = (customer.tags ?? []).filter((customerTag) => customerTag !== tag)
    const db = getOttoClient()
    const updateRes = await db
      .from('customers')
      .update({ tags: nextTags, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('orgId', orgId)
      .select('tags')
      .single()

    assertSupabaseError(updateRes.error, 'Failed to remove customer tag')
    return NextResponse.json({ tags: updateRes.data?.tags ?? nextTags })
  } catch (error) {
    console.error('Error removing tag:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
