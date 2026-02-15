import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSMS } from '@/lib/twilio'
import { renderTemplate } from '@/lib/template-engine'

interface BulkSmsBody {
  customerIds: string[]
  message: string
  useTemplate: boolean
  templateBody?: string
}

export async function POST(request: NextRequest) {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { customerIds, message, useTemplate, templateBody }: BulkSmsBody = await request.json()
    if (!Array.isArray(customerIds) || customerIds.length === 0 || customerIds.length > 100) {
      return NextResponse.json({ error: 'customerIds must be a non-empty array (max 100)' }, { status: 400 })
    }

    const [customers, twilioConfig, org] = await Promise.all([
      prisma.customer.findMany({
        where: { id: { in: customerIds }, orgId, smsConsent: true },
        select: { id: true, phone: true, firstName: true },
      }),
      prisma.twilioConfig.findUnique({ where: { orgId } }),
      prisma.organization.findUnique({ where: { clerkOrgId: orgId }, select: { name: true, phone: true } }),
    ])
    if (!twilioConfig || !twilioConfig.isActive) {
      return NextResponse.json({ error: 'Twilio not configured for this organization' }, { status: 400 })
    }

    let sent = 0
    let failed = 0
    const skipped = customerIds.length - customers.length

    for (const customer of customers) {
      const renderedBody = useTemplate && templateBody
        ? renderTemplate(templateBody, {
            firstName: customer.firstName, shopName: org?.name ?? '', shopPhone: org?.phone ?? '',
          })
        : message
      const record = await prisma.reminderMessage.create({
        data: {
          orgId, customerId: customer.id, scheduledAt: new Date(),
          direction: 'outbound', body: renderedBody, status: 'queued',
        },
      })
      try {
        await sendSMS({
          to: customer.phone, body: renderedBody, orgId,
          customerId: customer.id, reminderMessageId: record.id,
        })
        sent++
      } catch {
        await prisma.reminderMessage.update({
          where: { id: record.id }, data: { status: 'failed' },
        })
        failed++
      }
    }

    return NextResponse.json({ sent, failed, skipped })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
