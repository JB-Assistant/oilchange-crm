import { prisma } from './prisma'
import { renderTemplate, DEFAULT_TEMPLATES } from './template-engine'
import { generateAIMessage, isAIAvailable, type OrgAiConfig } from './ai-sms'
import { decrypt, isEncrypted } from './crypto'

interface EvaluationResult {
  queued: number
  aiGenerated: number
  errors: string[]
}

interface OrgInput {
  clerkOrgId: string
  name: string
  phone?: string | null
  reminderEnabled: boolean
  reminderQuietStart: number
  reminderQuietEnd: number
  aiPersonalization: boolean
  aiTone: string
}

export async function evaluateReminders(org: OrgInput): Promise<EvaluationResult> {
  let queued = 0
  let aiGenerated = 0
  const errors: string[] = []
  // Load org-level AI config if available
  let orgAiConfig: OrgAiConfig | undefined
  const aiConfigRow = await prisma.aiConfig.findUnique({ where: { orgId: org.clerkOrgId } })
  if (aiConfigRow?.isActive) {
    const rawKey = isEncrypted(aiConfigRow.apiKey) ? decrypt(aiConfigRow.apiKey) : aiConfigRow.apiKey
    orgAiConfig = { provider: aiConfigRow.provider, model: aiConfigRow.model, apiKey: rawKey }
  }

  const useAI = org.aiPersonalization && isAIAvailable(orgAiConfig)

  try {
    // 1. Check quiet hours
    const hour = new Date().getHours()
    const isQuietHours = org.reminderQuietStart > org.reminderQuietEnd
      ? hour >= org.reminderQuietStart || hour < org.reminderQuietEnd
      : hour >= org.reminderQuietStart && hour < org.reminderQuietEnd

    if (isQuietHours) {
      return { queued: 0, aiGenerated: 0, errors: ['Quiet hours - skipping evaluation'] }
    }

    // 2. Verify Twilio is configured and active
    const twilioConfig = await prisma.twilioConfig.findUnique({
      where: { orgId: org.clerkOrgId },
    })

    if (!twilioConfig || !twilioConfig.isActive) {
      return { queued: 0, aiGenerated: 0, errors: ['Twilio not configured or inactive'] }
    }

    // 3. Fetch active service_due reminder rules with templates
    const rules = await prisma.reminderRule.findMany({
      where: { orgId: org.clerkOrgId, isActive: true, reminderType: 'service_due' },
      include: {
        template: true,
        serviceType: true,
      },
    })

    if (rules.length === 0) {
      return { queued: 0, aiGenerated: 0, errors: ['No active reminder rules'] }
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

          // 8. Generate message body (AI or static template)
          const dueDate = latestRecord.nextDueDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })
          const daysSinceLast = Math.floor(
            (now.getTime() - latestRecord.serviceDate.getTime()) / (1000 * 60 * 60 * 24)
          )
          const daysOverdue = Math.max(0, Math.floor(
            (now.getTime() - latestRecord.nextDueDate.getTime()) / (1000 * 60 * 60 * 24)
          ))

          let body: string
          let wasAIGenerated = false

          if (useAI) {
            const aiResult = await generateAIMessage({
              customerFirstName: customer.firstName,
              shopName: org.name,
              shopPhone: org.phone || '',
              serviceType: rule.serviceType.displayName,
              vehicleYear: vehicle.year,
              vehicleMake: vehicle.make,
              vehicleModel: vehicle.model,
              dueDate,
              daysSinceLastService: daysSinceLast,
              mileageAtLastService: vehicle.mileageAtLastService,
              isOverdue: daysOverdue > 0,
              daysOverdue,
              tone: org.aiTone as 'friendly' | 'professional' | 'casual',
              sequenceNumber: rule.sequenceNumber,
            }, orgAiConfig)

            if (!aiResult.fallbackUsed && aiResult.body) {
              body = aiResult.body
              wasAIGenerated = true
              aiGenerated++
            } else {
              // AI failed — fall back to static template
              const templateBody = rule.template?.body ?? getFallbackTemplate(rule.sequenceNumber)
              body = renderTemplate(templateBody, {
                firstName: customer.firstName,
                shopName: org.name,
                shopPhone: org.phone || '',
                serviceType: rule.serviceType.displayName,
                dueDate,
                vehicleYear: vehicle.year,
                vehicleMake: vehicle.make,
              })
            }
          } else {
            const templateBody = rule.template?.body ?? getFallbackTemplate(rule.sequenceNumber)
            body = renderTemplate(templateBody, {
              firstName: customer.firstName,
              shopName: org.name,
              shopPhone: org.phone || '',
              serviceType: rule.serviceType.displayName,
              dueDate,
              vehicleYear: vehicle.year,
              vehicleMake: vehicle.make,
            })
          }

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
                aiGenerated: wasAIGenerated,
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

    return { queued, aiGenerated, errors }
  } catch (error) {
    errors.push(String(error))
    return { queued, aiGenerated, errors }
  }
}

function getFallbackTemplate(sequenceNumber: number): string {
  switch (sequenceNumber) {
    case 1: return DEFAULT_TEMPLATES.twoWeeksBefore
    case 2: return DEFAULT_TEMPLATES.oneWeekBefore
    case 3: return DEFAULT_TEMPLATES.dueDateReminder
    case 4: return DEFAULT_TEMPLATES.oneWeekOverdue
    case 5: return DEFAULT_TEMPLATES.twoWeeksOverdue
    default: return DEFAULT_TEMPLATES.twoWeeksBefore
  }
}
