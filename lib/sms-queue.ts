import { createProductAdminClient } from '@/lib/supabase/server'
import { sendSMS } from './twilio'

interface SendResult {
  sent: number
  failed: number
  skipped: number
}

export async function sendQueuedMessages(): Promise<SendResult> {
  let sent = 0
  let failed = 0
  let skipped = 0
  const db = await createProductAdminClient()

  try {
    const { data: messages } = await db
      .from('reminder_messages')
      .select('id, org_id, customer_id, vehicle_id, repair_order_id, body, to_phone')
      .eq('status', 'queued')
      .lte('scheduled_at', new Date().toISOString())
      .limit(100)

    if (!messages || messages.length === 0) return { sent, failed, skipped }

    // Pre-fetch quiet hours for all orgs in this batch (avoids broken FK join)
    const orgIds = [...new Set(messages.map((m) => m.org_id))]
    const { data: shops } = await db
      .from('shops')
      .select('org_id, reminder_quiet_start, reminder_quiet_end')
      .in('org_id', orgIds)

    const shopByOrg = new Map(
      (shops ?? []).map((s) => [s.org_id, s])
    )

    for (const message of messages) {
      try {
        const shop = shopByOrg.get(message.org_id)
        if (shop) {
          const hour = new Date().getHours()
          const qStart = shop.reminder_quiet_start
          const qEnd = shop.reminder_quiet_end
          const isQuiet = qStart > qEnd
            ? hour >= qStart || hour < qEnd
            : hour >= qStart && hour < qEnd

          if (isQuiet) { skipped++; continue }
        }

        await sendSMS({
          to: message.to_phone,
          body: message.body,
          orgId: message.org_id,
          customerId: message.customer_id ?? undefined,
          vehicleId: message.vehicle_id ?? undefined,
          repairOrderId: message.repair_order_id ?? undefined,
          reminderMessageId: message.id,
        })

        sent++
      } catch (error) {
        console.error(`Failed to send message ${message.id}:`, error)

        await db
          .from('reminder_messages')
          .update({ status: 'failed', status_updated_at: new Date().toISOString() })
          .eq('id', message.id)

        failed++
      }
    }

    return { sent, failed, skipped }
  } catch (error) {
    console.error('Error in sendQueuedMessages:', error)
    return { sent, failed, skipped }
  }
}

interface InboundMessage {
  from: string
  to: string
  body: string
  messageSid: string
}

export async function processInboundMessage({ from, to, body, messageSid }: InboundMessage) {
  const db = await createProductAdminClient()

  try {
    const { data: customer } = await db
      .from('customers')
      .select('id, first_name, last_name, phone, org_id')
      .eq('phone', from)
      .maybeSingle()

    if (!customer) {
      console.log(`No customer found for phone: ${from}`)
      return
    }

    const { data: shop } = await db
      .from('shops')
      .select('name')
      .eq('org_id', customer.org_id)
      .maybeSingle()

    const messageBody = body.toUpperCase().trim()

    await db.from('reminder_messages').insert({
      org_id: customer.org_id,
      customer_id: customer.id,
      direction: 'inbound',
      body,
      from_phone: from,
      to_phone: to,
      twilio_sid: messageSid,
      status: 'delivered',
      status_updated_at: new Date().toISOString(),
      scheduled_at: new Date().toISOString(),
    })

    if (messageBody === 'STOP' || messageBody.startsWith('STOP')) {
      await db
        .from('customers')
        .update({ sms_consent: false, sms_consent_date: new Date().toISOString() })
        .eq('id', customer.id)

      await db.from('consent_logs').insert({
        org_id: customer.org_id,
        customer_id: customer.id,
        action: 'opt_out',
        source: 'sms_reply',
        performed_by: 'system',
      })

      await sendSMS({
        to: from,
        body: `You have been unsubscribed from ${shop?.name ?? 'our'} reminders. Reply START to re-subscribe.`,
        orgId: customer.org_id,
      })
      return
    }

    if (messageBody === 'START') {
      await db
        .from('customers')
        .update({ sms_consent: true, sms_consent_date: new Date().toISOString() })
        .eq('id', customer.id)

      await db.from('consent_logs').insert({
        org_id: customer.org_id,
        customer_id: customer.id,
        action: 'opt_in',
        source: 'sms_reply',
        performed_by: 'system',
      })

      await sendSMS({
        to: from,
        body: `You are now subscribed to ${shop?.name ?? 'our'} reminders.`,
        orgId: customer.org_id,
      })
      return
    }

    if (messageBody === 'BOOK') {
      const { data: recentReminder } = await db
        .from('reminder_messages')
        .select('id, repair_order_id')
        .eq('customer_id', customer.id)
        .eq('direction', 'outbound')
        .not('repair_order_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (recentReminder?.repair_order_id) {
        await db.from('follow_up_records').insert({
          customer_id: customer.id,
          repair_order_id: recentReminder.repair_order_id,
          org_id: customer.org_id,
          method: 'text',
          outcome: 'scheduled',
          notes: 'Customer replied BOOK to schedule via SMS',
          contact_date: new Date().toISOString(),
        })
      }

      await sendSMS({
        to: from,
        body: `Thanks! We'll call you shortly to schedule your appointment.`,
        orgId: customer.org_id,
      })
      return
    }

    // Log other replies
    const { data: recentMessage } = await db
      .from('reminder_messages')
      .select('id, repair_order_id')
      .eq('customer_id', customer.id)
      .eq('direction', 'outbound')
      .not('repair_order_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recentMessage?.repair_order_id) {
      await db.from('follow_up_records').insert({
        customer_id: customer.id,
        repair_order_id: recentMessage.repair_order_id,
        org_id: customer.org_id,
        method: 'text',
        outcome: 'no_response',
        notes: `Customer reply: ${body}`,
        contact_date: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error('Error processing inbound message:', error)
  }
}
