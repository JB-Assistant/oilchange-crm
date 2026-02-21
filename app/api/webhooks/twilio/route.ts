import { NextRequest, NextResponse } from 'next/server'
import { createProductAdminClient } from '@/lib/supabase/server'
import { processInboundMessage } from '@/lib/sms-queue'
import { validateRequest } from 'twilio'
import { decrypt, isEncrypted } from '@/lib/crypto'

type MessageStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered'

function mapTwilioStatus(status: string): MessageStatus {
  const map: Record<string, MessageStatus> = {
    queued: 'queued', sent: 'sent', delivered: 'delivered', failed: 'failed', undelivered: 'undelivered',
  }
  return map[status] || 'sent'
}

async function verifyTwilioSignature(req: NextRequest, params: Record<string, string>): Promise<boolean> {
  const signature = req.headers.get('x-twilio-signature')
  if (!signature) return false

  const webhookUrl = process.env.TWILIO_WEBHOOK_URL
  if (!webhookUrl) return false

  const url = `${webhookUrl}/api/webhooks/twilio`
  const phoneNumber = params.To || params.From

  const db = await createProductAdminClient()
  const { data: config } = await db
    .from('twilio_configs')
    .select('auth_token')
    .eq('phone_number', phoneNumber)
    .eq('is_active', true)
    .maybeSingle()

  if (!config) return false

  const authToken = isEncrypted(config.auth_token) ? decrypt(config.auth_token) : config.auth_token
  return validateRequest(authToken, signature, url, params)
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const params: Record<string, string> = {}
    for (const [key, value] of new URLSearchParams(rawBody).entries()) {
      params[key] = value
    }

    const clonedReq = new NextRequest(req.url, { headers: req.headers })
    const isValid = await verifyTwilioSignature(clonedReq, params)
    if (!isValid) {
      console.warn('[twilio-webhook] Invalid signature')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { From: from, To: to, Body: body, MessageSid: messageSid, MessageStatus: messageStatus } = params

    if (messageStatus && messageSid) {
      const db = await createProductAdminClient()
      await db
        .from('reminder_messages')
        .update({ status: mapTwilioStatus(messageStatus), status_updated_at: new Date().toISOString() })
        .eq('twilio_sid', messageSid)
      return NextResponse.json({ success: true })
    }

    if (from && body) {
      await processInboundMessage({ from, to, body, messageSid })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[twilio-webhook]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
