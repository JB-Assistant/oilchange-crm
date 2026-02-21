import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'
import { sendSMS } from '@/lib/twilio'
import { renderTemplate } from '@/lib/template-engine'

interface BulkSmsBody {
  customerIds: string[]
  message: string
  useTemplate: boolean
  templateBody?: string
}

export async function POST(request: NextRequest) {
  const { orgId: clerkOrgId } = await auth()
  if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { customerIds, message, useTemplate, templateBody }: BulkSmsBody = await request.json()
    if (!Array.isArray(customerIds) || customerIds.length === 0 || customerIds.length > 100) {
      return NextResponse.json({ error: 'customerIds must be a non-empty array (max 100)' }, { status: 400 })
    }

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const now = new Date().toISOString()

    const [{ data: customers }, { data: twilioConfig }, { data: shop }] = await Promise.all([
      db.from('customers')
        .select('id, phone, first_name')
        .in('id', customerIds)
        .eq('org_id', orgId)
        .eq('sms_consent', true),
      db.from('twilio_configs')
        .select('is_active')
        .eq('org_id', orgId)
        .maybeSingle(),
      db.from('shops')
        .select('name, phone')
        .eq('org_id', orgId)
        .maybeSingle(),
    ])

    if (!twilioConfig?.is_active) {
      return NextResponse.json({ error: 'Twilio not configured for this organization' }, { status: 400 })
    }

    let sent = 0
    let failed = 0
    const skipped = customerIds.length - (customers?.length ?? 0)

    for (const customer of (customers ?? [])) {
      const renderedBody = useTemplate && templateBody
        ? renderTemplate(templateBody, {
            firstName: customer.first_name, shopName: shop?.name ?? '', shopPhone: shop?.phone ?? '',
          })
        : message

      const { data: record } = await db
        .from('reminder_messages')
        .insert({
          org_id: orgId,
          customer_id: customer.id,
          scheduled_at: now,
          direction: 'outbound',
          body: renderedBody,
          status: 'queued',
        })
        .select('id')
        .single()

      try {
        await sendSMS({
          to: customer.phone, body: renderedBody, orgId,
          customerId: customer.id, reminderMessageId: record?.id,
        })
        sent++
      } catch {
        if (record?.id) {
          await db.from('reminder_messages').update({ status: 'failed' }).eq('id', record.id)
        }
        failed++
      }
    }

    return NextResponse.json({ sent, failed, skipped })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
