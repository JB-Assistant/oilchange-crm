import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { assertSupabaseError, getOttoClient } from '@/lib/supabase/otto'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    const db = getOttoClient()
    const { data, error } = await db
      .from('service_types')
      .update({ ...body, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('orgId', orgId)
      .select('*')
      .maybeSingle()

    assertSupabaseError(error, 'Failed to update service type')
    if (!data) {
      return NextResponse.json({ error: 'Service type not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating service type:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const db = getOttoClient()
    const { error } = await db
      .from('service_types')
      .delete()
      .eq('id', id)
      .eq('orgId', orgId)

    assertSupabaseError(error, 'Failed to delete service type')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting service type:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
