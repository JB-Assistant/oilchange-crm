import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceTypeSchema } from '@/lib/validations'
import { assertSupabaseError } from '@/lib/supabase/otto'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'
import { ZodError } from 'zod'

export async function GET() {
  try {
    const { userId, orgId: clerkOrgId } = await auth()
    if (!userId || !clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()

    const { data, error } = await db
      .from('service_types')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('display_name', { ascending: true })
    assertSupabaseError(error, 'Failed to fetch service types')

    return NextResponse.json(data ?? [])
  } catch (error) {
    console.error('[service-types] GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, orgId: clerkOrgId } = await auth()
    if (!userId || !clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const data = createServiceTypeSchema.parse(body)
    const now = new Date().toISOString()

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()

    const { data: inserted, error } = await db
      .from('service_types')
      .insert({
        id: crypto.randomUUID(),
        org_id: orgId,
        name: data.name,
        display_name: data.displayName,
        category: data.category ?? 'general',
        description: data.description ?? null,
        default_mileage_interval: data.defaultMileageInterval ?? null,
        default_time_interval_days: data.defaultTimeIntervalDays ?? null,
        reminder_lead_days: data.reminderLeadDays,
        is_custom: true,
        is_active: true,
        sort_order: 0,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single()
    assertSupabaseError(error, 'Failed to create service type')

    return NextResponse.json(inserted, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    console.error('[service-types] POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
