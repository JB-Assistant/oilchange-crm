import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { resolveOrgId } from '@/lib/supabase/server'
import { sendSMS } from '@/lib/twilio'

export async function POST(req: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { to } = await req.json()
    if (!to) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })

    const orgId = await resolveOrgId(clerkOrgId)

    const message = await sendSMS({
      to,
      body: 'This is a test message from OilChange Pro. Your SMS reminders are working!',
      orgId,
    })

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error('[twilio-config/test]:', error)
    return NextResponse.json({ error: 'Failed to send test message' }, { status: 500 })
  }
}
