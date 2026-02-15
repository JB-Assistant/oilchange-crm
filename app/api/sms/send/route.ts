import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSMS } from '@/lib/twilio'
import { sendSmsSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let data
  try {
    const json = await request.json()
    data = sendSmsSchema.parse(json)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { customerId, body, vehicleId, serviceRecordId } = data

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
