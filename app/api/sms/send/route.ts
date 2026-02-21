import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'
import { sendSMS } from '@/lib/twilio'
import { sendSmsSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
  const { orgId: clerkOrgId } = await auth()
  if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let data
  try {
    data = sendSmsSchema.parse(await request.json())
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { customerId, body, vehicleId, serviceRecordId } = data

  try {
    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const now = new Date().toISOString()

    const { data: customer } = await db
      .from('customers')
      .select('id, phone')
      .eq('id', customerId)
      .eq('org_id', orgId)
      .maybeSingle()

    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const { data: record } = await db
      .from('reminder_messages')
      .insert({
        org_id: orgId,
        customer_id: customerId,
        vehicle_id: vehicleId || null,
        repair_order_id: serviceRecordId || null,
        scheduled_at: now,
        direction: 'outbound',
        body: body.trim(),
        status: 'queued',
      })
      .select('id')
      .single()

    try {
      await sendSMS({
        to: customer.phone,
        body: body.trim(),
        orgId,
        customerId,
        vehicleId,
        repairOrderId: serviceRecordId,
        reminderMessageId: record?.id,
      })
      return NextResponse.json({ success: true, messageId: record?.id })
    } catch (error) {
      if (record?.id) {
        await db.from('reminder_messages').update({ status: 'failed' }).eq('id', record.id)
      }
      const message = error instanceof Error ? error.message : 'Failed to send SMS'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  } catch (error) {
    console.error('[sms/send]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
