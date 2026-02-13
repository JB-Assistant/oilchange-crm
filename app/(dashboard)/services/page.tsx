export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from '@/lib/format'
import Link from 'next/link'
import { Wrench, ChevronRight, Inbox } from 'lucide-react'

export default async function ServicesPage() {
  const { orgId } = await auth()

  if (!orgId) {
    redirect('/')
  }

  const services = await prisma.serviceRecord.findMany({
    where: {
      vehicle: {
        customer: {
          orgId,
        },
      },
    },
    include: {
      vehicle: {
        include: {
          customer: true,
        },
      },
    },
    orderBy: { serviceDate: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Services</h1>
        <p className="text-muted-foreground mt-1">All service records across your shop</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Services ({services.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-10 h-10 text-zinc-400" />
              </div>
              <p className="text-zinc-600 mb-2">No service records yet</p>
              <p className="text-sm text-zinc-500">
                Service records will appear here once you add them to customer vehicles.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {services.map((service) => {
                const customer = service.vehicle.customer
                const vehicle = service.vehicle

                return (
                  <Link
                    key={service.id}
                    href={`/customers/${customer.id}`}
                    className="group flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <Wrench className="w-5 h-5 text-zinc-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {customer.firstName} {customer.lastName}
                        </p>
                        <p className="text-sm text-zinc-600 truncate">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium capitalize">
                          {service.serviceType.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-zinc-600">
                          {format.mileage(service.mileageAtService)}
                        </p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-sm">{format.date(service.serviceDate)}</p>
                        <p className="text-xs text-zinc-600">
                          Next: {format.date(service.nextDueDate)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
