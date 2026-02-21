import { createProductAdminClient } from '@/lib/supabase/server'
import { renderTemplate, DEFAULT_TEMPLATES } from './template-engine'
import { generateAIMessage, isAIAvailable, type OrgAiConfig } from './ai-sms'
import { decrypt, isEncrypted } from './crypto'

interface EvaluationResult {
  queued: number
  aiGenerated: number
  errors: string[]
}

interface OrgInput {
  orgId: string           // UUID from public.orgs
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
  const db = await createProductAdminClient()

  // Load org-level AI config
  let orgAiConfig: OrgAiConfig | undefined
  const { data: aiConfigRow } = await db
    .from('ai_configs')
    .select('provider, model, api_key, is_active')
    .eq('org_id', org.orgId)
    .maybeSingle()

  if (aiConfigRow?.is_active) {
    const rawKey = isEncrypted(aiConfigRow.api_key) ? decrypt(aiConfigRow.api_key) : aiConfigRow.api_key
    orgAiConfig = { provider: aiConfigRow.provider, model: aiConfigRow.model, apiKey: rawKey }
  }

  const useAI = org.aiPersonalization && isAIAvailable(orgAiConfig)

  try {
    const hour = new Date().getHours()
    const isQuiet = org.reminderQuietStart > org.reminderQuietEnd
      ? hour >= org.reminderQuietStart || hour < org.reminderQuietEnd
      : hour >= org.reminderQuietStart && hour < org.reminderQuietEnd

    if (isQuiet) {
      return { queued: 0, aiGenerated: 0, errors: ['Quiet hours - skipping evaluation'] }
    }

    const { data: twilioConfig } = await db
      .from('twilio_configs')
      .select('phone_number, is_active')
      .eq('org_id', org.orgId)
      .maybeSingle()

    if (!twilioConfig || !twilioConfig.is_active) {
      return { queued: 0, aiGenerated: 0, errors: ['Twilio not configured or inactive'] }
    }

    const { data: rules } = await db
      .from('reminder_rules')
      .select('id, sequence_number, offset_days, reminder_type, service_type_id, template_id, reminder_templates(body), service_types(name, display_name)')
      .eq('org_id', org.orgId)
      .eq('is_active', true)
      .eq('reminder_type', 'service_due')

    if (!rules || rules.length === 0) {
      return { queued: 0, aiGenerated: 0, errors: ['No active reminder rules'] }
    }

    const { data: customers } = await db
      .from('customers')
      .select('id, first_name, last_name, phone')
      .eq('org_id', org.orgId)
      .eq('sms_consent', true)

    if (!customers || customers.length === 0) {
      return { queued: 0, aiGenerated: 0, errors: [] }
    }

    const customerIds = customers.map((c: { id: string }) => c.id)

    const { data: vehicles } = await db
      .from('vehicles')
      .select('id, customer_id, year, make, model, mileage_at_last_service')
      .in('customer_id', customerIds)

    if (!vehicles || vehicles.length === 0) return { queued, aiGenerated, errors }

    const vehicleIds = vehicles.map((v: { id: string }) => v.id)

    const { data: repairOrders } = await db
      .from('repair_orders')
      .select('id, vehicle_id, service_date, service_type, next_due_date, next_due_mileage')
      .in('vehicle_id', vehicleIds)
      .order('service_date', { ascending: false })

    if (!repairOrders || repairOrders.length === 0) return { queued, aiGenerated, errors }

    const latestByVehicle = new Map<string, typeof repairOrders[number]>()
    for (const ro of repairOrders) {
      if (!latestByVehicle.has(ro.vehicle_id)) latestByVehicle.set(ro.vehicle_id, ro)
    }

    const vehiclesByCustomer = new Map<string, typeof vehicles>()
    for (const v of vehicles) {
      const arr = vehiclesByCustomer.get(v.customer_id) ?? []
      arr.push(v)
      vehiclesByCustomer.set(v.customer_id, arr)
    }

    const now = new Date()

    for (const customer of customers) {
      const customerVehicles = vehiclesByCustomer.get(customer.id) ?? []

      for (const vehicle of customerVehicles) {
        const latestOrder = latestByVehicle.get(vehicle.id)
        if (!latestOrder) continue

        for (const rule of rules) {
          const serviceType = rule.service_types as { name: string; display_name: string } | null
          if (!serviceType) continue

          if (
            serviceType.name !== latestOrder.service_type &&
            !latestOrder.service_type.startsWith(serviceType.name.replace(/_conventional|_synthetic/, ''))
          ) {
            continue
          }

          const scheduledDate = new Date(latestOrder.next_due_date)
          scheduledDate.setDate(scheduledDate.getDate() + rule.offset_days)

          const threeDaysAgo = new Date(now)
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

          if (scheduledDate > now || scheduledDate < threeDaysAgo) continue

          const { count } = await db
            .from('reminder_messages')
            .select('id', { count: 'exact', head: true })
            .eq('customer_id', customer.id)
            .eq('vehicle_id', vehicle.id)
            .eq('repair_order_id', latestOrder.id)
            .eq('rule_id', rule.id)
            .in('status', ['queued', 'sent', 'delivered'])

          if (count && count > 0) continue

          const dueDate = new Date(latestOrder.next_due_date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric',
          })
          const daysSinceLast = Math.floor(
            (now.getTime() - new Date(latestOrder.service_date).getTime()) / (1000 * 60 * 60 * 24)
          )
          const daysOverdue = Math.max(0, Math.floor(
            (now.getTime() - new Date(latestOrder.next_due_date).getTime()) / (1000 * 60 * 60 * 24)
          ))

          let body: string
          let wasAIGenerated = false
          const templateBody = (rule.reminder_templates as { body: string } | null)?.body
            ?? getFallbackTemplate(rule.sequence_number)

          if (useAI) {
            const aiResult = await generateAIMessage({
              customerFirstName: customer.first_name,
              shopName: org.name,
              shopPhone: org.phone || '',
              serviceType: serviceType.display_name,
              vehicleYear: vehicle.year,
              vehicleMake: vehicle.make,
              vehicleModel: vehicle.model,
              dueDate,
              daysSinceLastService: daysSinceLast,
              mileageAtLastService: vehicle.mileage_at_last_service,
              isOverdue: daysOverdue > 0,
              daysOverdue,
              tone: org.aiTone as 'friendly' | 'professional' | 'casual',
              sequenceNumber: rule.sequence_number,
            }, orgAiConfig)

            if (!aiResult.fallbackUsed && aiResult.body) {
              body = aiResult.body
              wasAIGenerated = true
              aiGenerated++
            } else {
              body = renderTemplate(templateBody, {
                firstName: customer.first_name,
                shopName: org.name,
                shopPhone: org.phone || '',
                serviceType: serviceType.display_name,
                dueDate,
                vehicleYear: vehicle.year,
                vehicleMake: vehicle.make,
              })
            }
          } else {
            body = renderTemplate(templateBody, {
              firstName: customer.first_name,
              shopName: org.name,
              shopPhone: org.phone || '',
              serviceType: serviceType.display_name,
              dueDate,
              vehicleYear: vehicle.year,
              vehicleMake: vehicle.make,
            })
          }

          try {
            await db.from('reminder_messages').insert({
              org_id: org.orgId,
              customer_id: customer.id,
              vehicle_id: vehicle.id,
              repair_order_id: latestOrder.id,
              rule_id: rule.id,
              template_id: rule.template_id ?? null,
              scheduled_at: scheduledDate.toISOString(),
              status: 'queued',
              direction: 'outbound',
              body,
              ai_generated: wasAIGenerated,
              to_phone: customer.phone,
              from_phone: twilioConfig.phone_number,
            })
            queued++
          } catch (err) {
            errors.push(`Failed to queue for ${customer.first_name} ${customer.last_name}: ${err}`)
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
