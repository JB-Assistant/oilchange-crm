import { NextRequest, NextResponse } from 'next/server'
import { createProductAdminClient } from '@/lib/supabase/server'
import { evaluateReminders } from '@/lib/reminder-engine'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = await createProductAdminClient()
    const { data: shops } = await db
      .from('shops')
      .select('org_id, name, phone, reminder_enabled, reminder_quiet_start, reminder_quiet_end, ai_personalization, ai_tone')
      .eq('reminder_enabled', true)

    const results = []
    for (const shop of (shops ?? [])) {
      const result = await evaluateReminders({
        orgId: shop.org_id,
        name: shop.name,
        phone: shop.phone,
        reminderEnabled: shop.reminder_enabled,
        reminderQuietStart: shop.reminder_quiet_start ?? 21,
        reminderQuietEnd: shop.reminder_quiet_end ?? 9,
        aiPersonalization: shop.ai_personalization ?? false,
        aiTone: shop.ai_tone ?? 'friendly',
      })
      results.push({
        orgId: shop.org_id,
        orgName: shop.name,
        remindersQueued: result.queued,
        aiGenerated: result.aiGenerated,
        errors: result.errors,
      })
    }

    return NextResponse.json({ success: true, processed: results.length, results })
  } catch (error) {
    console.error('[cron/process-reminders]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
