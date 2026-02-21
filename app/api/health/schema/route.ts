export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { type PostgrestError } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createPlatformAdminClient, createProductAdminClient } from '@/lib/supabase/server'

type CheckResult = {
  check: string
  ok: boolean
  error: {
    code: string | null
    message: string
    details: string | null
    hint: string | null
  } | null
  remediation: string | null
}

function remediationForError(error: PostgrestError | null): string | null {
  if (!error?.message) return null
  const msg = error.message.toLowerCase()

  if (msg.includes('column customers.status does not exist')) {
    return 'Run supabase/phase0-migration.sql (section 0d legacy compatibility for otto.customers).'
  }
  if (msg.includes('column') && msg.includes('does not exist')) {
    return 'Run supabase/phase0-migration.sql to apply missing column/table compatibility patches.'
  }
  if (msg.includes('relation') && msg.includes('does not exist')) {
    return 'Run supabase/phase0-migration.sql to create missing otto tables.'
  }
  if (msg.includes('no unique or exclusion constraint matching the on conflict specification')) {
    return 'Create unique index on otto.shops(org_id), or rerun supabase/phase0-migration.sql.'
  }
  return null
}

function toCheckResult(check: string, error: PostgrestError | null): CheckResult {
  return {
    check,
    ok: !error,
    error: error ? {
      code: error.code ?? null,
      message: error.message ?? 'Unknown Supabase error',
      details: error.details ?? null,
      hint: error.hint ?? null,
    } : null,
    remediation: remediationForError(error),
  }
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const platform = await createPlatformAdminClient()
  const db = await createProductAdminClient()

  const checks = await Promise.all([
    platform.from('orgs').select('id, slug, clerk_org_id').limit(1).then((r) => toCheckResult('public.orgs bridge columns', r.error)),
    platform.from('org_members').select('id, org_id, user_id, role').limit(1).then((r) => toCheckResult('public.org_members membership table', r.error)),
    db.from('shops').select('id, org_id, name, subscription_status, subscription_tier, reminder_enabled, ai_personalization').limit(1).then((r) => toCheckResult('otto.shops expected columns', r.error)),
    db.from('customers').select('id, org_id, first_name, last_name, status, sms_consent, tags, updated_at').limit(1).then((r) => toCheckResult('otto.customers expected columns', r.error)),
    db.from('vehicles').select('id, org_id, customer_id, year, make, model, license_plate, mileage_at_last_service, updated_at').limit(1).then((r) => toCheckResult('otto.vehicles expected columns', r.error)),
    db.from('repair_orders').select('id, org_id, vehicle_id, service_date, service_type, mileage_at_service, next_due_date, next_due_mileage, notes').limit(1).then((r) => toCheckResult('otto.repair_orders expected columns', r.error)),
    db.from('follow_up_records').select('id, org_id, customer_id, contact_date').limit(1).then((r) => toCheckResult('otto.follow_up_records table', r.error)),
    db.from('appointments').select('id, org_id, customer_id, scheduled_at, status').limit(1).then((r) => toCheckResult('otto.appointments table', r.error)),
    db.from('locations').select('id, org_id, name, is_default').limit(1).then((r) => toCheckResult('otto.locations table', r.error)),
    db.from('service_types').select('id, org_id, name, display_name').limit(1).then((r) => toCheckResult('otto.service_types table', r.error)),
    db.from('reminder_templates').select('id, org_id, name, body').limit(1).then((r) => toCheckResult('otto.reminder_templates table', r.error)),
    db.from('reminder_rules').select('id, org_id, service_type_id, sequence_number').limit(1).then((r) => toCheckResult('otto.reminder_rules table', r.error)),
    db.from('reminder_messages').select('id, org_id, status, direction').limit(1).then((r) => toCheckResult('otto.reminder_messages table', r.error)),
    db.from('consent_logs').select('id, org_id, customer_id, action').limit(1).then((r) => toCheckResult('otto.consent_logs table', r.error)),
    db.from('twilio_configs').select('id, org_id, account_sid, phone_number, is_active').limit(1).then((r) => toCheckResult('otto.twilio_configs table', r.error)),
    db.from('ai_configs').select('id, org_id, provider, model, is_active').limit(1).then((r) => toCheckResult('otto.ai_configs table', r.error)),
    db.from('customer_notes').select('id, org_id, customer_id, body').limit(1).then((r) => toCheckResult('otto.customer_notes table', r.error)),
  ])

  const failed = checks.filter((check) => !check.ok)
  const ok = failed.length === 0

  return NextResponse.json(
    {
      ok,
      checkedAt: new Date().toISOString(),
      summary: {
        total: checks.length,
        passed: checks.length - failed.length,
        failed: failed.length,
      },
      checks,
      nextSteps: ok
        ? []
        : [
            'Run supabase/phase0-migration.sql in Supabase SQL Editor.',
            'If this is a new environment, run supabase/baseline-setup.sql first, then phase0-migration.sql.',
            'Re-run GET /api/health/schema until all checks pass.',
          ],
    },
    { status: ok ? 200 : 500 }
  )
}
