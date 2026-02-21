export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Car, StickyNote, Activity, MessageSquare } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { History } from 'lucide-react'
import { CustomerHeader } from '@/components/customers/customer-header'
import { ContactInfo } from '@/components/customers/contact-info'
import { VehicleCard } from '@/components/customers/vehicle-card'
import { FollowUpHistory } from '@/components/customers/follow-up-history'
import { CustomerNotes } from '@/components/customers/customer-notes'
import { CustomerTags } from '@/components/customers/customer-tags'
import { ActivityTimeline } from '@/components/customers/activity-timeline'
import { MessageHistory } from '@/components/customers/message-history'
import { assertSupabaseError } from '@/lib/supabase/otto'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'
import { type CustomerStatus } from '@/lib/db/enums'

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>
}

interface CustomerRow {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string | null
  status: string
  tags: string[]
  created_at: string
}

interface VehicleRow {
  id: string
  customer_id: string
  year: number
  make: string
  model: string
  license_plate: string | null
}

interface ServiceRecordRow {
  id: string
  vehicle_id: string
  service_type: string
  service_date: string
  mileage_at_service: number
  next_due_date: string
  next_due_mileage: number
  notes: string | null
}

interface FollowUpRow {
  id: string
  customer_id: string
  repair_order_id: string
  contact_date: string
  method: string
  outcome: string
  notes: string | null
  staff_member: string | null
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { orgId: clerkOrgId } = await auth()
  const { id } = await params
  if (!clerkOrgId) redirect('/')

  const orgId = await resolveOrgId(clerkOrgId)
  const db = await createProductAdminClient()

  const { data: customerRow, error: customerError } = await db
    .from('customers')
    .select('id, first_name, last_name, phone, email, status, tags, created_at')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle()

  assertSupabaseError(customerError, 'Failed to fetch customer')
  if (!customerRow) notFound()
  const customer = customerRow as CustomerRow

  const [vehiclesRes, followUpsRes] = await Promise.all([
    db
      .from('vehicles')
      .select('id, customer_id, year, make, model, license_plate')
      .eq('customer_id', customer.id),
    db
      .from('follow_up_records')
      .select('id, customer_id, repair_order_id, contact_date, method, outcome, notes, staff_member')
      .eq('customer_id', customer.id)
      .eq('org_id', orgId)
      .order('contact_date', { ascending: false })
      .limit(10),
  ])

  assertSupabaseError(vehiclesRes.error, 'Failed to fetch customer vehicles')
  assertSupabaseError(followUpsRes.error, 'Failed to fetch follow-up records')

  const vehicles = (vehiclesRes.data ?? []) as VehicleRow[]
  const followUps = (followUpsRes.data ?? []) as FollowUpRow[]

  const vehicleIds = vehicles.map((vehicle) => vehicle.id)
  let serviceRecords: ServiceRecordRow[] = []

  if (vehicleIds.length > 0) {
    const { data, error } = await db
      .from('repair_orders')
      .select('id, vehicle_id, service_type, service_date, mileage_at_service, next_due_date, next_due_mileage, notes')
      .in('vehicle_id', vehicleIds)
      .order('service_date', { ascending: false })
    assertSupabaseError(error, 'Failed to fetch service records')
    serviceRecords = (data ?? []) as ServiceRecordRow[]
  }

  const serviceRecordsByVehicle = new Map<string, ServiceRecordRow[]>()
  for (const record of serviceRecords) {
    const existing = serviceRecordsByVehicle.get(record.vehicle_id)
    if (existing) {
      existing.push(record)
    } else {
      serviceRecordsByVehicle.set(record.vehicle_id, [record])
    }
  }

  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]))
  const serviceRecordById = new Map(serviceRecords.map((record) => [record.id, record]))

  const hydratedVehicles = vehicles.map((vehicle) => ({
    id: vehicle.id,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    licensePlate: vehicle.license_plate,
    serviceRecords: (serviceRecordsByVehicle.get(vehicle.id) ?? []).map((record) => ({
      id: record.id,
      serviceType: record.service_type,
      serviceDate: new Date(record.service_date),
      mileageAtService: record.mileage_at_service,
      nextDueDate: new Date(record.next_due_date),
      nextDueMileage: record.next_due_mileage,
      notes: record.notes,
    })),
  }))

  const hydratedFollowUps = followUps.map((followUp) => {
    const serviceRecord = serviceRecordById.get(followUp.repair_order_id)
    const vehicle = serviceRecord ? vehicleById.get(serviceRecord.vehicle_id) : null

    return {
      id: followUp.id,
      outcome: followUp.outcome,
      method: followUp.method,
      contactDate: new Date(followUp.contact_date),
      notes: followUp.notes,
      staffMember: followUp.staff_member,
      serviceRecord: serviceRecord && vehicle ? {
        vehicle: { year: vehicle.year, make: vehicle.make },
      } : null,
    }
  })

  return (
    <div className="space-y-6">
      <CustomerHeader
        id={customer.id}
        firstName={customer.first_name}
        lastName={customer.last_name}
        phone={customer.phone}
        email={customer.email}
        status={customer.status as CustomerStatus}
        vehicleCount={hydratedVehicles.length}
      />

      <ContactInfo phone={customer.phone} email={customer.email} createdAt={new Date(customer.created_at)} />

      <CustomerTags customerId={customer.id} initialTags={customer.tags ?? []} />

      <Tabs defaultValue="vehicles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="vehicles" className="gap-2"><Car className="w-4 h-4" />Vehicles</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="w-4 h-4" />Follow-Ups</TabsTrigger>
          <TabsTrigger value="notes" className="gap-2"><StickyNote className="w-4 h-4" />Notes</TabsTrigger>
          <TabsTrigger value="messages" className="gap-2"><MessageSquare className="w-4 h-4" />Messages</TabsTrigger>
          <TabsTrigger value="activity" className="gap-2"><Activity className="w-4 h-4" />Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="space-y-6">
          {hydratedVehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} customerId={customer.id} />
          ))}
          {hydratedVehicles.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Car className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-600 mb-4">No vehicles registered</p>
                <Button>Add Vehicle</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <FollowUpHistory records={hydratedFollowUps} />
        </TabsContent>

        <TabsContent value="notes">
          <CustomerNotes customerId={customer.id} />
        </TabsContent>

        <TabsContent value="messages">
          <MessageHistory customerId={customer.id} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTimeline customerId={customer.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
