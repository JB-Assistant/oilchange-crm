import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceTypeSchema } from '@/lib/validations'
import { assertSupabaseError, getOttoClient } from '@/lib/supabase/otto'
import { ZodError } from 'zod'

export async function GET() {
  try {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getOttoClient()
    const { data, error } = await db
      .from('service_types')
      .select('*')
      .eq('orgId', orgId)
      .eq('isActive', true)
      .order('category', { ascending: true })
      .order('sortOrder', { ascending: true })
      .order('displayName', { ascending: true })

    assertSupabaseError(error, 'Failed to fetch service types')
    return NextResponse.json(data ?? [])
  } catch (error) {
    console.error('Error fetching service types:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = createServiceTypeSchema.parse(body)
    const now = new Date().toISOString()

    const db = getOttoClient()
    const { data: inserted, error } = await db
      .from('service_types')
      .insert({
        id: crypto.randomUUID(),
        orgId,
        name: data.name,
        displayName: data.displayName,
        category: data.category ?? 'general',
        description: data.description ?? null,
        defaultMileageInterval: data.defaultMileageInterval ?? null,
        defaultTimeIntervalDays: data.defaultTimeIntervalDays ?? null,
        reminderLeadDays: data.reminderLeadDays,
        isCustom: true,
        isActive: true,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      })
      .select('*')
      .single()

    assertSupabaseError(error, 'Failed to create service type')
    return NextResponse.json(inserted, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Error creating service type:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
