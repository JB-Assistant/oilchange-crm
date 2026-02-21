import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { assertSupabaseError, getOttoClient } from '@/lib/supabase/otto'

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
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getOttoClient()
    const locationsRes = await db
      .from('locations')
      .select('*')
      .eq('orgId', orgId)
      .order('isDefault', { ascending: false })
      .order('name', { ascending: true })

    assertSupabaseError(locationsRes.error, 'Failed to fetch locations')
    return NextResponse.json({ data: locationsRes.data ?? [] })
  } catch (error) {
    console.error('Error fetching locations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: { name: string; address?: string; phone?: string; isDefault?: boolean } = await req.json()
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const db = getOttoClient()
    if (body.isDefault) {
      const resetDefaultsRes = await db
        .from('locations')
        .update({ isDefault: false, updatedAt: new Date().toISOString() })
        .eq('orgId', orgId)
      assertSupabaseError(resetDefaultsRes.error, 'Failed to unset default locations')
    }

    const now = new Date().toISOString()
    const locationRes = await db
      .from('locations')
      .insert({
        id: crypto.randomUUID(),
        orgId,
        name: body.name.trim(),
        address: body.address?.trim() ?? null,
        phone: body.phone?.trim() ?? null,
        isDefault: body.isDefault ?? false,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .select('*')
      .single()

    assertSupabaseError(locationRes.error, 'Failed to create location')
    return NextResponse.json(locationRes.data, { status: 201 })
  } catch (error) {
    console.error('Error creating location:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: PatchBody = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: 'Location id is required' }, { status: 400 })
    }

    const db = getOttoClient()
    if (body.isDefault) {
      const resetDefaultsRes = await db
        .from('locations')
        .update({ isDefault: false, updatedAt: new Date().toISOString() })
        .eq('orgId', orgId)
      assertSupabaseError(resetDefaultsRes.error, 'Failed to unset default locations')
    }

    const updateRes = await db
      .from('locations')
      .update({
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.address !== undefined && { address: body.address.trim() }),
        ...(body.phone !== undefined && { phone: body.phone.trim() }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', body.id)
      .eq('orgId', orgId)
      .select('*')
      .maybeSingle()

    assertSupabaseError(updateRes.error, 'Failed to update location')
    if (!updateRes.data) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    return NextResponse.json(updateRes.data)
  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
