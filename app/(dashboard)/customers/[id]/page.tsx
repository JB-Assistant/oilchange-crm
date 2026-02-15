export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
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

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { orgId } = await auth()
  const { id } = await params
  if (!orgId) redirect('/')

  const customer = await prisma.customer.findFirst({
    where: { id, orgId },
    include: {
      vehicles: { include: { serviceRecords: { orderBy: { serviceDate: 'desc' } } } },
      followUpRecords: {
        orderBy: { contactDate: 'desc' },
        take: 10,
        include: { serviceRecord: { include: { vehicle: true } } }
      }
    }
  })

  if (!customer) notFound()

  return (
    <div className="space-y-6">
      <CustomerHeader
        id={customer.id}
        firstName={customer.firstName}
        lastName={customer.lastName}
        phone={customer.phone}
        email={customer.email}
        status={customer.status}
        vehicleCount={customer.vehicles.length}
      />

      <ContactInfo phone={customer.phone} email={customer.email} createdAt={customer.createdAt} />

      <CustomerTags customerId={customer.id} initialTags={customer.tags} />

      <Tabs defaultValue="vehicles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="vehicles" className="gap-2"><Car className="w-4 h-4" />Vehicles</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="w-4 h-4" />Follow-Ups</TabsTrigger>
          <TabsTrigger value="notes" className="gap-2"><StickyNote className="w-4 h-4" />Notes</TabsTrigger>
          <TabsTrigger value="messages" className="gap-2"><MessageSquare className="w-4 h-4" />Messages</TabsTrigger>
          <TabsTrigger value="activity" className="gap-2"><Activity className="w-4 h-4" />Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="space-y-6">
          {customer.vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} customerId={customer.id} />
          ))}
          {customer.vehicles.length === 0 && (
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
          <FollowUpHistory records={customer.followUpRecords} />
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
