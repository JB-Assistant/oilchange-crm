import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { assertSupabaseError } from '@/lib/supabase/otto'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'

type PatchBody = {
  id: string
  name?: string
  address?: string
  phone?: string
  isDefault?: boolean
  isActive?: boolean
}

export async function GET() {
  try {
    const { userId, orgId: clerkOrgId } = await auth()
    if (!userId || !clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()

    const locationsRes = await db
      .from('locations')
      .select('*')
      .eq('org_id', orgId)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })
    assertSupabaseError(locationsRes.error, 'Failed to fetch locations')

    return NextResponse.json({ data: locationsRes.data ?? [] })
  } catch (error) {
    console.error('[locations] GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, orgId: clerkOrgId } = await auth()
    if (!userId || !clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: { name: string; address?: string; phone?: string; isDefault?: boolean } = await req.json()
    if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const now = new Date().toISOString()

    if (body.isDefault) {
      const resetRes = await db
        .from('locations')
        .update({ is_default: false, updated_at: now })
        .eq('org_id', orgId)
      assertSupabaseError(resetRes.error, 'Failed to unset default locations')
    }

    const locationRes = await db
      .from('locations')
      .insert({
        id: crypto.randomUUID(),
        org_id: orgId,
        name: body.name.trim(),
        address: body.address?.trim() ?? null,
        phone: body.phone?.trim() ?? null,
        is_default: body.isDefault ?? false,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single()
    assertSupabaseError(locationRes.error, 'Failed to create location')

    return NextResponse.json(locationRes.data, { status: 201 })
  } catch (error) {
    console.error('[locations] POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, orgId: clerkOrgId } = await auth()
    if (!userId || !clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: PatchBody = await req.json()
    if (!body.id) return NextResponse.json({ error: 'Location id is required' }, { status: 400 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const now = new Date().toISOString()

    if (body.isDefault) {
      const resetRes = await db
        .from('locations')
        .update({ is_default: false, updated_at: now })
        .eq('org_id', orgId)
      assertSupabaseError(resetRes.error, 'Failed to unset default locations')
    }

    const updateRes = await db
      .from('locations')
      .update({
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.address !== undefined && { address: body.address.trim() }),
        ...(body.phone !== undefined && { phone: body.phone.trim() }),
        ...(body.isDefault !== undefined && { is_default: body.isDefault }),
        ...(body.isActive !== undefined && { is_active: body.isActive }),
        updated_at: now,
      })
      .eq('id', body.id)
      .eq('org_id', orgId)
      .select('*')
      .maybeSingle()
    assertSupabaseError(updateRes.error, 'Failed to update location')

    if (!updateRes.data) return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    return NextResponse.json(updateRes.data)
  } catch (error) {
    console.error('[locations] PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
