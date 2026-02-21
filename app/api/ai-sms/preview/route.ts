import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'
import { generateAIMessage, isAIAvailable, type AIMessageContext, type OrgAiConfig } from '@/lib/ai-sms'
import { renderTemplate, DEFAULT_TEMPLATES } from '@/lib/template-engine'
import { decrypt, isEncrypted } from '@/lib/crypto'

interface PreviewBody {
  customerId?: string
  tone?: AIMessageContext['tone']
  sequenceNumber?: number
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const daysBetween = (a: Date, b: Date) =>
  Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))

export async function POST(req: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: PreviewBody = await req.json()
    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()

    const { data: shop } = await db
      .from('shops')
      .select('name, phone, ai_tone')
      .eq('org_id', orgId)
      .maybeSingle()

    const orgName = shop?.name ?? 'Your Shop'
    const orgPhone = shop?.phone ?? '(555) 000-0000'
    const orgTone = shop?.ai_tone ?? 'friendly'

    let context: AIMessageContext

    if (body.customerId) {
      const { data: customer } = await db
        .from('customers')
        .select('id, first_name')
        .eq('id', body.customerId)
        .eq('org_id', orgId)
        .maybeSingle()

      if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

      const { data: vehicles } = await db
        .from('vehicles')
        .select('id, year, make, model')
        .eq('customer_id', customer.id)
        .limit(1)

      const vehicle = vehicles?.[0]
      let latestRO: {
        service_type: string; service_date: string; next_due_date: string; mileage_at_service: number
      } | null = null

      if (vehicle) {
        const { data: orders } = await db
          .from('repair_orders')
          .select('service_type, service_date, next_due_date, mileage_at_service')
          .eq('vehicle_id', vehicle.id)
          .order('service_date', { ascending: false })
          .limit(1)
        latestRO = orders?.[0] ?? null
      }

      const now = new Date()
      const dueDate = latestRO ? new Date(latestRO.next_due_date) : now
      const daysOverdue = dueDate < now ? daysBetween(dueDate, now) : 0

      context = {
        customerFirstName: customer.first_name,
        shopName: orgName,
        shopPhone: orgPhone,
        serviceType: latestRO?.service_type ?? 'Oil Change',
        vehicleYear: vehicle?.year ?? 2020,
        vehicleMake: vehicle?.make ?? 'Unknown',
        vehicleModel: vehicle?.model ?? 'Vehicle',
        dueDate: fmtDate(dueDate),
        daysSinceLastService: latestRO ? daysBetween(new Date(latestRO.service_date), now) : 0,
        mileageAtLastService: latestRO?.mileage_at_service ?? null,
        isOverdue: daysOverdue > 0,
        daysOverdue,
        tone: (body.tone ?? orgTone) as AIMessageContext['tone'],
        sequenceNumber: body.sequenceNumber ?? 1,
      }
    } else {
      context = {
        customerFirstName: 'Sarah', shopName: orgName, shopPhone: orgPhone,
        serviceType: 'Oil Change (Synthetic)', vehicleYear: 2021,
        vehicleMake: 'Toyota', vehicleModel: 'Camry', dueDate: 'Mar 15',
        daysSinceLastService: 175, mileageAtLastService: 42000,
        isOverdue: false, daysOverdue: 0,
        tone: (body.tone ?? orgTone) as AIMessageContext['tone'],
        sequenceNumber: body.sequenceNumber ?? 1,
      }
    }

    let orgAiConfig: OrgAiConfig | undefined
    const { data: aiConfigRow } = await db
      .from('ai_configs')
      .select('provider, model, api_key, is_active')
      .eq('org_id', orgId)
      .maybeSingle()

    if (aiConfigRow?.is_active) {
      const rawKey = isEncrypted(aiConfigRow.api_key) ? decrypt(aiConfigRow.api_key) : aiConfigRow.api_key
      orgAiConfig = { provider: aiConfigRow.provider, model: aiConfigRow.model, apiKey: rawKey }
    }

    const aiAvailable = isAIAvailable(orgAiConfig)
    const aiResult = aiAvailable
      ? await generateAIMessage(context, orgAiConfig)
      : { body: '', fallbackUsed: true }

    const staticMessage = renderTemplate(DEFAULT_TEMPLATES.twoWeeksBefore, {
      firstName: context.customerFirstName, shopName: context.shopName,
      shopPhone: context.shopPhone, serviceType: context.serviceType,
      vehicleYear: String(context.vehicleYear), vehicleMake: context.vehicleMake,
      vehicleModel: context.vehicleModel, dueDate: context.dueDate,
    })

    return NextResponse.json({ aiMessage: aiResult.body, staticMessage, aiAvailable })
  } catch (error) {
    console.error('[ai-sms/preview]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
