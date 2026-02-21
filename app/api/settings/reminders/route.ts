import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createProductAdminClient } from '@/lib/supabase/server'
import { ensureOrganization } from '@/lib/ensure-org'

export async function GET() {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await ensureOrganization(clerkOrgId)
    const db = await createProductAdminClient()

    const [shopRes, serviceTypesRes] = await Promise.all([
      db.from('shops').select('reminder_enabled, reminder_quiet_start, reminder_quiet_end').eq('org_id', orgId).maybeSingle(),
      db.from('service_types').select('*').eq('org_id', orgId),
    ])

    return NextResponse.json({
      settings: shopRes.data ? {
        enabled: shopRes.data.reminder_enabled,
        quietStart: shopRes.data.reminder_quiet_start,
        quietEnd: shopRes.data.reminder_quiet_end,
      } : null,
      serviceTypes: serviceTypesRes.data ?? [],
    })
  } catch (error) {
    console.error('[settings/reminders] GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { settings, serviceTypes } = await req.json()
    const orgId = await ensureOrganization(clerkOrgId)
    const db = await createProductAdminClient()
    const now = new Date().toISOString()

    await db
      .from('shops')
      .update({ reminder_enabled: settings.enabled, reminder_quiet_start: settings.quietStart, reminder_quiet_end: settings.quietEnd, updated_at: now })
      .eq('org_id', orgId)

    for (const type of serviceTypes) {
      await db.from('service_types').upsert(
        {
          id: type.id || crypto.randomUUID(),
          org_id: orgId,
          name: type.name,
          display_name: type.displayName,
          default_mileage_interval: type.defaultMileageInterval,
          default_time_interval_days: type.defaultTimeIntervalDays,
          reminder_lead_days: type.reminderLeadDays,
          is_active: true,
          is_custom: false,
          category: type.category ?? 'general',
          sort_order: type.sortOrder ?? 0,
          updated_at: now,
        },
        { onConflict: 'id' }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[settings/reminders] POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
