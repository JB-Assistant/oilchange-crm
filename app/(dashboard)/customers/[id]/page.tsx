import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { format } from '@/lib/format'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  Car,
  Calendar,
  Gauge,
  History,
  MessageSquare,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Building
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { FollowUpForm } from '@/components/follow-up-form'
import { AddServiceForm } from '@/components/add-service-form'

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { orgId } = await auth()
  const { id } = await params
  
  if (!orgId) {
    redirect('/')
  }

  const customer = await prisma.customer.findFirst({
    where: { id, orgId },
    include: {
      vehicles: {
        include: {
          serviceRecords: {
            orderBy: { serviceDate: 'desc' }
          }
        }
      },
      followUpRecords: {
        orderBy: { contactDate: 'desc' },
        take: 10,
        include: {
          serviceRecord: {
            include: {
              vehicle: true
            }
          }
        }
      }
    }
  })

  if (!customer) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {customer.firstName} {customer.lastName}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={customer.status} />
              <span className="text-sm text-zinc-600">
                {customer.vehicles.length} vehicle{customer.vehicles.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`tel:${customer.phone}`}>
            <Button variant="outline" className="gap-2">
              <Phone className="w-4 h-4" />
              Call
            </Button>
          </Link>
        </div>
      </div>

      {/* Contact Info */}
      <Card>
        <CardContent className="p-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-zinc-600" />
              </div>
              <div>
                <p className="text-sm text-zinc-600">Phone</p>
                <p className="font-medium">{format.phone(customer.phone)}</p>
              </div>
            </div>
            {customer.email && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-zinc-600" />
                </div>
                <div>
                  <p className="text-sm text-zinc-600">Email</p>
                  <p className="font-medium">{customer.email}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-zinc-600" />
              </div>
              <div>
                <p className="text-sm text-zinc-600">Customer Since</p>
                <p className="font-medium">{format.date(customer.createdAt)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="vehicles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="vehicles" className="gap-2">
            <Car className="w-4 h-4" />
            Vehicles & Services
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Follow-Up History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="space-y-6">
          {/* Vehicles */}
          {customer.vehicles.map((vehicle) => (
            <Card key={vehicle.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </CardTitle>
                  <AddServiceForm vehicleId={vehicle.id} customerId={customer.id} />
                </div>
                {vehicle.licensePlate && (
                  <p className="text-sm text-zinc-600">License: {vehicle.licensePlate}</p>
                )}
              </CardHeader>
              <CardContent>
                {vehicle.serviceRecords.length === 0 ? (
                  <p className="text-zinc-600 text-center py-4">No service records yet</p>
                ) : (
                  <div className="space-y-4">
                    {vehicle.serviceRecords.map((record) => (
                      <div key={record.id} className="p-4 bg-zinc-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{record.serviceType === 'oil_change' ? 'Oil Change' : record.serviceType}</p>
                          <span className="text-sm text-zinc-600">{format.date(record.serviceDate)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-zinc-600">
                            <Gauge className="w-4 h-4" />
                            Service at {record.mileageAtService.toLocaleString()} mi
                          </div>
                          <div className="flex items-center gap-2 text-zinc-600">
                            <Calendar className="w-4 h-4" />
                            Next due: {format.date(record.nextDueDate)}
                          </div>
                        </div>
                        {record.notes && (
                          <p className="text-sm text-zinc-600 mt-2">{record.notes}</p>
                        )}
                        <Separator className="my-3" />
                        <FollowUpForm 
                          customerId={customer.id} 
                          serviceRecordId={record.id}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Follow-Up History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer.followUpRecords.length === 0 ? (
                <p className="text-zinc-600 text-center py-8">No follow-up records yet</p>
              ) : (
                <div className="space-y-4">
                  {customer.followUpRecords.map((record) => (
                    <div key={record.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <OutcomeIcon outcome={record.outcome} />
                          <span className="font-medium capitalize">{record.outcome.replace('_', ' ')}</span>
                          <span className="text-zinc-400">•</span>
                          <span className="text-sm text-zinc-600 capitalize">{record.method}</span>
                        </div>
                        <span className="text-sm text-zinc-600">{format.date(record.contactDate)}</span>
                      </div>
                      {record.serviceRecord && (
                        <p className="text-sm text-zinc-600 mb-2">
                          For: {record.serviceRecord.vehicle.year} {record.serviceRecord.vehicle.make}
                        </p>
                      )}
                      {record.notes && (
                        <p className="text-sm text-zinc-600 bg-zinc-50 p-2 rounded">{record.notes}</p>
                      )}
                      {record.staffMember && (
                        <p className="text-xs text-zinc-500 mt-2">Logged by: {record.staffMember}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OutcomeIcon({ outcome }: { outcome: string }) {
  switch (outcome) {
    case 'scheduled':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />
    case 'not_interested':
    case 'wrong_number':
      return <XCircle className="w-4 h-4 text-red-500" />
    default:
      return <HelpCircle className="w-4 h-4 text-zinc-500" />
  }
}
