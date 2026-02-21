import twilio from 'twilio'
import { createProductAdminClient } from '@/lib/supabase/server'
import { decrypt, isEncrypted } from './crypto'

interface SendSMSOptions {
  to: string
  body: string
  orgId: string          // UUID from public.orgs
  customerId?: string
  vehicleId?: string
  repairOrderId?: string
  reminderMessageId?: string
}

export async function sendSMS({
  to,
  body,
  orgId,
  customerId,
  vehicleId,
  repairOrderId,
  reminderMessageId,
}: SendSMSOptions) {
  const db = await createProductAdminClient()

  const { data: config } = await db
    .from('twilio_configs')
    .select('account_sid, auth_token, phone_number, is_active')
    .eq('org_id', orgId)
    .maybeSingle()

  if (!config || !config.is_active) {
    throw new Error('Twilio not configured for this organization')
  }

  const sid = isEncrypted(config.account_sid) ? decrypt(config.account_sid) : config.account_sid
  const token = isEncrypted(config.auth_token) ? decrypt(config.auth_token) : config.auth_token
  const client = twilio(sid, token)

  const webhookUrl = process.env.TWILIO_WEBHOOK_URL
  const message = await client.messages.create({
    body,
    from: config.phone_number,
    to,
    ...(webhookUrl && { statusCallback: `${webhookUrl}/api/webhooks/twilio` }),
  })

  if (reminderMessageId) {
    await db
      .from('reminder_messages')
      .update({
        twilio_sid: message.sid,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', reminderMessageId)
  }

  return message
}

export async function getTwilioClient(orgId: string) {
  const db = await createProductAdminClient()

  const { data: config } = await db
    .from('twilio_configs')
    .select('account_sid, auth_token, is_active')
    .eq('org_id', orgId)
    .maybeSingle()

  if (!config || !config.is_active) {
    throw new Error('Twilio not configured for this organization')
  }

  const sid = isEncrypted(config.account_sid) ? decrypt(config.account_sid) : config.account_sid
  const token = isEncrypted(config.auth_token) ? decrypt(config.auth_token) : config.auth_token
  return twilio(sid, token)
}
