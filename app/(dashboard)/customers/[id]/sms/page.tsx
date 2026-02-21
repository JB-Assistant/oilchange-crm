export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { SmsComposeForm } from '@/components/sms-compose-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { assertSupabaseError } from '@/lib/supabase/otto'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'

interface SmsPageProps {
  params: Promise<{ id: string }>
}

interface CustomerRow {
  id: string
  first_name: string
  last_name: string
  phone: string
  sms_consent: boolean
}

interface VehicleRow {
  id: string
  customer_id: string
  year: number
  make: string
  model: string
}

interface ServiceRow {
  id: string
  vehicle_id: string
  service_type: string
  next_due_date: string
  service_date: string
}

interface TemplateRow {
  id: string
  name: string
  body: string
}

export default async function SmsPage({ params }: SmsPageProps) {
  const { orgId: clerkOrgId } = await auth()
  const { id } = await params
  if (!clerkOrgId) redirect('/')

  const orgId = await resolveOrgId(clerkOrgId)
  const db = await createProductAdminClient()

  const [customerRes, shopRes, templatesRes, twilioRes] = await Promise.all([
    db
      .from('customers')
      .select('id, first_name, last_name, phone, sms_consent')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle(),
    db
      .from('shops')
      .select('name, phone')
      .eq('org_id', orgId)
      .maybeSingle(),
    db
      .from('reminder_templates')
      .select('id, name, body')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true }),
    db
      .from('twilio_configs')
      .select('is_active')
      .eq('org_id', orgId)
      .maybeSingle(),
  ])

  assertSupabaseError(customerRes.error, 'Failed to fetch SMS customer')
  assertSupabaseError(shopRes.error, 'Failed to fetch SMS organization')
  assertSupabaseError(templatesRes.error, 'Failed to fetch SMS templates')
  assertSupabaseError(twilioRes.error, 'Failed to fetch Twilio config')

  const customer = customerRes.data as CustomerRow | null
  const shop = shopRes.data
  const templates = (templatesRes.data ?? []) as TemplateRow[]

  if (!customer || !shop) notFound()

  const vehiclesRes = await db
    .from('vehicles')
    .select('id, customer_id, year, make, model')
    .eq('customer_id', customer.id)
  assertSupabaseError(vehiclesRes.error, 'Failed to fetch customer vehicles for SMS')

  const vehicles = (vehiclesRes.data ?? []) as VehicleRow[]
  const vehicleIds = vehicles.map((vehicle) => vehicle.id)
  let serviceRows: ServiceRow[] = []

  if (vehicleIds.length > 0) {
    const serviceRes = await db
      .from('repair_orders')
      .select('id, vehicle_id, service_type, next_due_date, service_date')
      .in('vehicle_id', vehicleIds)
      .order('service_date', { ascending: false })
    assertSupabaseError(serviceRes.error, 'Failed to fetch vehicle service records for SMS')
    serviceRows = (serviceRes.data ?? []) as ServiceRow[]
  }

  const latestByVehicle = new Map<string, ServiceRow>()
  for (const record of serviceRows) {
    if (!latestByVehicle.has(record.vehicle_id)) {
      latestByVehicle.set(record.vehicle_id, record)
    }
  }

  const twilioActive = twilioRes.data?.is_active ?? false

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/customers/${customer.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Send SMS</h1>
          <p className="text-sm text-zinc-600">
            {customer.first_name} {customer.last_name}
          </p>
        </div>
      </div>

      {!twilioActive && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1 text-sm">
            Twilio is not configured. Messages cannot be sent until you{' '}
            <Link href="/settings/sms" className="underline font-medium">
              configure SMS settings
            </Link>.
          </div>
        </div>
      )}

      <SmsComposeForm
        customer={{
          id: customer.id,
          firstName: customer.first_name,
          lastName: customer.last_name,
          phone: customer.phone,
          smsConsent: customer.sms_consent,
        }}
        vehicles={vehicles.map((vehicle) => {
          const latestService = latestByVehicle.get(vehicle.id)
          return {
            id: vehicle.id,
            year: vehicle.year,
            make: vehicle.make,
            model: vehicle.model,
            latestService: latestService
              ? {
                  id: latestService.id,
                  serviceType: latestService.service_type,
                  nextDueDate: latestService.next_due_date,
                }
              : null,
          }
        })}
        org={{ name: shop.name, phone: shop.phone ?? '' }}
        templates={templates.map((template) => ({
          id: template.id,
          name: template.name,
          body: template.body,
        }))}
        twilioActive={twilioActive}
      />
    </div>
  )
}
