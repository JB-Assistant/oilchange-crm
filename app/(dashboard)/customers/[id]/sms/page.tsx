export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { SmsComposeForm } from '@/components/sms-compose-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { assertSupabaseError, getOttoClient } from '@/lib/supabase/otto'

interface SmsPageProps {
  params: Promise<{ id: string }>
}

interface CustomerRow {
  id: string
  firstName: string
  lastName: string
  phone: string
  smsConsent: boolean
}

interface VehicleRow {
  id: string
  customerId: string
  year: number
  make: string
  model: string
}

interface ServiceRow {
  id: string
  vehicleId: string
  serviceType: string
  nextDueDate: string
  serviceDate: string
}

interface TemplateRow {
  id: string
  name: string
  body: string
}

export default async function SmsPage({ params }: SmsPageProps) {
  const { orgId } = await auth()
  const { id } = await params
  if (!orgId) redirect('/')

  const db = getOttoClient()
  const [customerRes, orgRes, templatesRes, twilioRes] = await Promise.all([
    db
      .from('customers')
      .select('id, firstName, lastName, phone, smsConsent')
      .eq('id', id)
      .eq('orgId', orgId)
      .maybeSingle(),
    db
      .from('organizations')
      .select('name, phone')
      .eq('clerkOrgId', orgId)
      .maybeSingle(),
    db
      .from('reminder_templates')
      .select('id, name, body')
      .eq('orgId', orgId)
      .order('createdAt', { ascending: true }),
    db
      .from('twilio_configs')
      .select('isActive')
      .eq('orgId', orgId)
      .maybeSingle(),
  ])

  assertSupabaseError(customerRes.error, 'Failed to fetch SMS customer')
  assertSupabaseError(orgRes.error, 'Failed to fetch SMS organization')
  assertSupabaseError(templatesRes.error, 'Failed to fetch SMS templates')
  assertSupabaseError(twilioRes.error, 'Failed to fetch Twilio config')

  const customer = customerRes.data as CustomerRow | null
  const org = orgRes.data
  const templates = (templatesRes.data ?? []) as TemplateRow[]

  if (!customer || !org) notFound()

  const vehiclesRes = await db
    .from('vehicles')
    .select('id, customerId, year, make, model')
    .eq('customerId', customer.id)
  assertSupabaseError(vehiclesRes.error, 'Failed to fetch customer vehicles for SMS')

  const vehicles = (vehiclesRes.data ?? []) as VehicleRow[]
  const vehicleIds = vehicles.map((vehicle) => vehicle.id)
  let serviceRows: ServiceRow[] = []

  if (vehicleIds.length > 0) {
    const serviceRes = await db
      .from('service_records')
      .select('id, vehicleId, serviceType, nextDueDate, serviceDate')
      .in('vehicleId', vehicleIds)
      .order('serviceDate', { ascending: false })
    assertSupabaseError(serviceRes.error, 'Failed to fetch vehicle service records for SMS')
    serviceRows = (serviceRes.data ?? []) as ServiceRow[]
  }

  const latestByVehicle = new Map<string, ServiceRow>()
  for (const record of serviceRows) {
    if (!latestByVehicle.has(record.vehicleId)) {
      latestByVehicle.set(record.vehicleId, record)
    }
  }

  const twilioActive = twilioRes.data?.isActive ?? false

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
            {customer.firstName} {customer.lastName}
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
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          smsConsent: customer.smsConsent,
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
                  serviceType: latestService.serviceType,
                  nextDueDate: latestService.nextDueDate,
                }
              : null,
          }
        })}
        org={{ name: org.name, phone: org.phone ?? '' }}
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
