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
import { assertSupabaseError, getOttoClient } from '@/lib/supabase/otto'
import { type CustomerStatus } from '@/lib/db/enums'

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>
}

interface CustomerRow {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  status: string
  tags: string[]
  createdAt: string
}

interface VehicleRow {
  id: string
  customerId: string
  year: number
  make: string
  model: string
  licensePlate: string | null
}

interface ServiceRecordRow {
  id: string
  vehicleId: string
  serviceType: string
  serviceDate: string
  mileageAtService: number
  nextDueDate: string
  nextDueMileage: number
  notes: string | null
}

interface FollowUpRow {
  id: string
  customerId: string
  serviceRecordId: string
  contactDate: string
  method: string
  outcome: string
  notes: string | null
  staffMember: string | null
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { orgId } = await auth()
  const { id } = await params
  if (!orgId) redirect('/')

  const db = getOttoClient()
  const { data: customerRow, error: customerError } = await db
    .from('customers')
    .select('id, firstName, lastName, phone, email, status, tags, createdAt')
    .eq('id', id)
    .eq('orgId', orgId)
    .maybeSingle()

  assertSupabaseError(customerError, 'Failed to fetch customer')
  if (!customerRow) notFound()
  const customer = customerRow as CustomerRow

  const [vehiclesRes, followUpsRes] = await Promise.all([
    db
      .from('vehicles')
      .select('id, customerId, year, make, model, licensePlate')
      .eq('customerId', customer.id),
    db
      .from('follow_up_records')
      .select('id, customerId, serviceRecordId, contactDate, method, outcome, notes, staffMember')
      .eq('customerId', customer.id)
      .eq('orgId', orgId)
      .order('contactDate', { ascending: false })
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
      .from('service_records')
      .select('id, vehicleId, serviceType, serviceDate, mileageAtService, nextDueDate, nextDueMileage, notes')
      .in('vehicleId', vehicleIds)
      .order('serviceDate', { ascending: false })
    assertSupabaseError(error, 'Failed to fetch service records')
    serviceRecords = (data ?? []) as ServiceRecordRow[]
  }

  const serviceRecordsByVehicle = new Map<string, ServiceRecordRow[]>()
  for (const record of serviceRecords) {
    const existing = serviceRecordsByVehicle.get(record.vehicleId)
    if (existing) {
      existing.push(record)
    } else {
      serviceRecordsByVehicle.set(record.vehicleId, [record])
    }
  }

  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]))
  const serviceRecordById = new Map(serviceRecords.map((record) => [record.id, record]))

  const hydratedVehicles = vehicles.map((vehicle) => ({
    id: vehicle.id,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    licensePlate: vehicle.licensePlate,
    serviceRecords: (serviceRecordsByVehicle.get(vehicle.id) ?? []).map((record) => ({
      id: record.id,
      serviceType: record.serviceType,
      serviceDate: new Date(record.serviceDate),
      mileageAtService: record.mileageAtService,
      nextDueDate: new Date(record.nextDueDate),
      nextDueMileage: record.nextDueMileage,
      notes: record.notes,
    })),
  }))

  const hydratedFollowUps = followUps.map((followUp) => {
    const serviceRecord = serviceRecordById.get(followUp.serviceRecordId)
    const vehicle = serviceRecord ? vehicleById.get(serviceRecord.vehicleId) : null

    return {
      id: followUp.id,
      outcome: followUp.outcome,
      method: followUp.method,
      contactDate: new Date(followUp.contactDate),
      notes: followUp.notes,
      staffMember: followUp.staffMember,
      serviceRecord: serviceRecord && vehicle ? {
        vehicle: { year: vehicle.year, make: vehicle.make },
      } : null,
    }
  })

  return (
    <div className="space-y-6">
      <CustomerHeader
        id={customer.id}
        firstName={customer.firstName}
        lastName={customer.lastName}
        phone={customer.phone}
        email={customer.email}
        status={customer.status as CustomerStatus}
        vehicleCount={hydratedVehicles.length}
      />

      <ContactInfo phone={customer.phone} email={customer.email} createdAt={new Date(customer.createdAt)} />

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
