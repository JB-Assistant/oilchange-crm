import { prisma } from './prisma'
import { renderTemplate, DEFAULT_TEMPLATES } from './template-engine'

interface EvaluationResult {
  queued: number
  errors: string[]
}

interface OrgInput {
  clerkOrgId: string
  name: string
  phone?: string | null
  reminderEnabled: boolean
  reminderQuietStart: number
  reminderQuietEnd: number
}

export async function evaluateReminders(org: OrgInput): Promise<EvaluationResult> {
  let queued = 0
  const errors: string[] = []

  try {
    // 1. Check quiet hours
    const hour = new Date().getHours()
    const isQuietHours = org.reminderQuietStart > org.reminderQuietEnd
      ? hour >= org.reminderQuietStart || hour < org.reminderQuietEnd
      : hour >= org.reminderQuietStart && hour < org.reminderQuietEnd

    if (isQuietHours) {
      return { queued: 0, errors: ['Quiet hours - skipping evaluation'] }
    }

    // 2. Verify Twilio is configured and active
    const twilioConfig = await prisma.twilioConfig.findUnique({
      where: { orgId: org.clerkOrgId },
    })

    if (!twilioConfig || !twilioConfig.isActive) {
      return { queued: 0, errors: ['Twilio not configured or inactive'] }
    }

    // 3. Fetch active reminder rules with templates
    const rules = await prisma.reminderRule.findMany({
      where: { orgId: org.clerkOrgId, isActive: true },
      include: {
        template: true,
        serviceType: true,
      },
    })

    if (rules.length === 0) {
      return { queued: 0, errors: ['No active reminder rules'] }
    }

    // 4. Fetch consented customers with vehicles and latest service records
    const customers = await prisma.customer.findMany({
      where: {
        orgId: org.clerkOrgId,
        smsConsent: true,
      },
      include: {
        vehicles: {
          include: {
            serviceRecords: {
              orderBy: { serviceDate: 'desc' },
              take: 1,
            },
          },
        },
      },
    })

    const now = new Date()

    // 5. For each customer → vehicle → service record → rule
    for (const customer of customers) {
      for (const vehicle of customer.vehicles) {
        const latestRecord = vehicle.serviceRecords[0]
        if (!latestRecord) continue

        for (const rule of rules) {
          // Match rule to service record type
          if (rule.serviceType.name !== latestRecord.serviceType &&
              !latestRecord.serviceType.startsWith(rule.serviceType.name.replace(/_conventional|_synthetic/, ''))) {
            continue
          }

          // 6. Calculate scheduled date
          const scheduledDate = new Date(latestRecord.nextDueDate)
          scheduledDate.setDate(scheduledDate.getDate() + rule.offsetDays)

          // Only queue if scheduled date is today or in the past (but not more than 3 days ago)
          const threeDaysAgo = new Date(now)
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

          if (scheduledDate > now || scheduledDate < threeDaysAgo) {
            continue
          }

          // 7. Deduplicate: skip if message already exists
          const existingMessage = await prisma.reminderMessage.findFirst({
            where: {
              customerId: customer.id,
              vehicleId: vehicle.id,
              serviceRecordId: latestRecord.id,
              reminderRuleId: rule.id,
              status: { in: ['queued', 'sent', 'delivered'] },
            },
          })

          if (existingMessage) continue

          // 8. Render template body
          const templateBody = rule.template?.body ?? getFallbackTemplate(rule.sequenceNumber)
          const body = renderTemplate(templateBody, {
            firstName: customer.firstName,
            shopName: org.name,
            shopPhone: org.phone || '',
            serviceType: rule.serviceType.displayName,
            dueDate: latestRecord.nextDueDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
            vehicleYear: vehicle.year,
            vehicleMake: vehicle.make,
          })

          // 9. Create queued ReminderMessage
          try {
            await prisma.reminderMessage.create({
              data: {
                orgId: org.clerkOrgId,
                customerId: customer.id,
                vehicleId: vehicle.id,
                serviceRecordId: latestRecord.id,
                reminderRuleId: rule.id,
                templateId: rule.template?.id ?? null,
                scheduledAt: scheduledDate,
                status: 'queued',
                direction: 'outbound',
                body,
                toPhone: customer.phone,
                fromPhone: twilioConfig.phoneNumber,
              },
            })
            queued++
          } catch (err) {
            errors.push(`Failed to queue for ${customer.firstName} ${customer.lastName}: ${err}`)
          }
        }
      }
    }

    return { queued, errors }
  } catch (error) {
    errors.push(String(error))
    return { queued, errors }
  }
}

function getFallbackTemplate(sequenceNumber: number): string {
  switch (sequenceNumber) {
    case 1: return DEFAULT_TEMPLATES.firstReminder
    case 2: return DEFAULT_TEMPLATES.dueDateReminder
    case 3: return DEFAULT_TEMPLATES.overdueReminder
    default: return DEFAULT_TEMPLATES.firstReminder
  }
}
