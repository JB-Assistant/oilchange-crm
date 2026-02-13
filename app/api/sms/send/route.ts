import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSMS } from '@/lib/twilio'

interface SendSmsBody {
  customerId: string
  body: string
  vehicleId?: string
  serviceRecordId?: string
}

export async function POST(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const json: SendSmsBody = await request.json()
  const { customerId, body, vehicleId, serviceRecordId } = json

  if (!customerId || !body?.trim()) {
    return NextResponse.json(
      { error: 'customerId and body are required' },
      { status: 400 }
    )
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, orgId },
    select: { id: true, phone: true },
  })

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  // Create a ReminderMessage record to track this message
  const reminderMessage = await prisma.reminderMessage.create({
    data: {
      orgId,
      customerId,
      vehicleId: vehicleId || null,
      serviceRecordId: serviceRecordId || null,
      scheduledAt: new Date(),
      direction: 'outbound',
      body: body.trim(),
      status: 'queued',
    },
  })

  try {
    await sendSMS({
      to: customer.phone,
      body: body.trim(),
      orgId,
      customerId,
      vehicleId,
      serviceRecordId,
      reminderMessageId: reminderMessage.id,
    })

    return NextResponse.json({ success: true, messageId: reminderMessage.id })
  } catch (error) {
    // Mark message as failed
    await prisma.reminderMessage.update({
      where: { id: reminderMessage.id },
      data: { status: 'failed' },
    })

    const message = error instanceof Error ? error.message : 'Failed to send SMS'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
