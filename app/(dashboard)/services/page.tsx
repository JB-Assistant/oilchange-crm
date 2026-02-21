export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from '@/lib/format'
import Link from 'next/link'
import { Wrench, ChevronRight, Inbox } from 'lucide-react'
import { assertSupabaseError, getOttoClient } from '@/lib/supabase/otto'

interface CustomerRow {
  id: string
  firstName: string
  lastName: string
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
  serviceDate: string
  mileageAtService: number
  serviceType: string
  nextDueDate: string
}

export default async function ServicesPage() {
  const { orgId } = await auth()
  if (!orgId) redirect('/')

  const db = getOttoClient()
  const { data: customerRows, error: customerError } = await db
    .from('customers')
    .select('id, firstName, lastName')
    .eq('orgId', orgId)
  assertSupabaseError(customerError, 'Failed to fetch customers for services page')

  const customers = (customerRows ?? []) as CustomerRow[]
  if (customers.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold">Services</h1>
          <p className="text-muted-foreground mt-1">All service records across your shop</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Services (0)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-10 h-10 text-zinc-400" />
              </div>
              <p className="text-zinc-600 mb-2">No service records yet</p>
              <p className="text-sm text-zinc-500">
                Service records will appear here once you add them to customer vehicles.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const customerIds = customers.map((customer) => customer.id)
  const { data: vehicleRows, error: vehicleError } = await db
    .from('vehicles')
    .select('id, customerId, year, make, model')
    .in('customerId', customerIds)
  assertSupabaseError(vehicleError, 'Failed to fetch vehicles for services page')
  const vehicles = (vehicleRows ?? []) as VehicleRow[]

  if (vehicles.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold">Services</h1>
          <p className="text-muted-foreground mt-1">All service records across your shop</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Services (0)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-10 h-10 text-zinc-400" />
              </div>
              <p className="text-zinc-600 mb-2">No service records yet</p>
              <p className="text-sm text-zinc-500">
                Service records will appear here once you add them to customer vehicles.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const vehicleIds = vehicles.map((vehicle) => vehicle.id)
  const { data: serviceRows, error: serviceError } = await db
    .from('service_records')
    .select('id, vehicleId, serviceDate, mileageAtService, serviceType, nextDueDate')
    .in('vehicleId', vehicleIds)
    .order('serviceDate', { ascending: false })
  assertSupabaseError(serviceError, 'Failed to fetch service records')
  const services = (serviceRows ?? []) as ServiceRow[]

  const customerById = new Map(customers.map((customer) => [customer.id, customer]))
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]))
  const hydratedServices = services
    .flatMap((service) => {
      const vehicle = vehicleById.get(service.vehicleId)
      if (!vehicle) return []
      const customer = customerById.get(vehicle.customerId)
      if (!customer) return []

      return [{
        ...service,
        vehicle,
        customer,
      }]
    })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Services</h1>
        <p className="text-muted-foreground mt-1">All service records across your shop</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Services ({hydratedServices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {hydratedServices.length === 0 ? (
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
              {hydratedServices.map((service) => {
                const customer = service.customer
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
