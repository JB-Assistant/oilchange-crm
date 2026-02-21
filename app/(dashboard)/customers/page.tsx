export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { CustomerFilters } from '@/components/customers/customer-filters'
import { CustomerListItem } from '@/components/customers/customer-list-item'
import { CustomerEmptyState } from '@/components/customers/customer-empty-state'
import { type CustomerStatus, CustomerStatus as CustomerStatusValues } from '@/lib/db/enums'
import { assertSupabaseError, buildSearchPattern, getOttoClient } from '@/lib/supabase/otto'

const PAGE_SIZE = 25

interface CustomersPageProps {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>
}

interface CustomerRow {
  id: string
  firstName: string
  lastName: string
  phone: string
  status: string
  createdAt: string
}

interface VehicleRow {
  id: string
  customerId: string
}

interface ServiceRow {
  vehicleId: string
  nextDueDate: string
  nextDueMileage: number
  serviceDate: string
}

function isCustomerStatus(value: string | undefined): value is CustomerStatus {
  if (!value) return false
  return Object.values(CustomerStatusValues).includes(value as CustomerStatus)
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const { orgId } = await auth()
  const params = await searchParams
  if (!orgId) redirect('/')

  const db = getOttoClient()
  const page = Math.max(1, parseInt(params.page || '1', 10))

  let customersQuery = db
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('orgId', orgId)
    .order('status', { ascending: true })
    .order('createdAt', { ascending: false })

  if (isCustomerStatus(params.status)) {
    customersQuery = customersQuery.eq('status', params.status)
  }

  if (params.search) {
    const pattern = buildSearchPattern(params.search)
    customersQuery = customersQuery.or(
      `firstName.ilike.${pattern},lastName.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`
    )
  }

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const { data: customerRows, count, error: customersError } = await customersQuery.range(from, to)
  assertSupabaseError(customersError, 'Failed to fetch customers')

  const customers = (customerRows ?? []) as CustomerRow[]
  const customerIds = customers.map((customer) => customer.id)

  let vehicles: VehicleRow[] = []
  let serviceRecords: ServiceRow[] = []

  if (customerIds.length > 0) {
    const { data: vehicleRows, error: vehicleError } = await db
      .from('vehicles')
      .select('id, customerId')
      .in('customerId', customerIds)
    assertSupabaseError(vehicleError, 'Failed to fetch customer vehicles')
    vehicles = (vehicleRows ?? []) as VehicleRow[]

    const vehicleIds = vehicles.map((vehicle) => vehicle.id)
    if (vehicleIds.length > 0) {
      const { data: serviceRows, error: serviceError } = await db
        .from('service_records')
        .select('vehicleId, nextDueDate, nextDueMileage, serviceDate')
        .in('vehicleId', vehicleIds)
        .order('serviceDate', { ascending: false })
      assertSupabaseError(serviceError, 'Failed to fetch service records')
      serviceRecords = (serviceRows ?? []) as ServiceRow[]
    }
  }

  const latestServiceByVehicle = new Map<string, ServiceRow>()
  for (const record of serviceRecords) {
    if (!latestServiceByVehicle.has(record.vehicleId)) {
      latestServiceByVehicle.set(record.vehicleId, record)
    }
  }

  const vehiclesByCustomer = new Map<string, Array<{ serviceRecords: Array<{ nextDueDate: Date; nextDueMileage: number }> }>>()
  for (const vehicle of vehicles) {
    const latestService = latestServiceByVehicle.get(vehicle.id)
    const normalizedVehicle = {
      serviceRecords: latestService ? [{
        nextDueDate: new Date(latestService.nextDueDate),
        nextDueMileage: latestService.nextDueMileage,
      }] : [],
    }

    const existing = vehiclesByCustomer.get(vehicle.customerId)
    if (existing) {
      existing.push(normalizedVehicle)
    } else {
      vehiclesByCustomer.set(vehicle.customerId, [normalizedVehicle])
    }
  }

  const hydratedCustomers = customers.map((customer) => ({
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    status: customer.status,
    vehicles: vehiclesByCustomer.get(customer.id) ?? [],
  }))

  const total = count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function buildPageUrl(targetPage: number) {
    const sp = new URLSearchParams()
    if (params.status) sp.set('status', params.status)
    if (params.search) sp.set('search', params.search)
    if (targetPage > 1) sp.set('page', String(targetPage))
    const qs = sp.toString()
    return `/customers${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground mt-1">Manage your customer base and service records</p>
        </div>
        <Link href="/customers/new">
          <Button className="gap-2"><Plus className="w-4 h-4" />Add Customer</Button>
        </Link>
      </div>

      <CustomerFilters searchQuery={params.search} statusFilter={params.status} />

      <Card>
        <CardHeader>
          <CardTitle>All Customers ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {hydratedCustomers.length === 0 ? (
            <CustomerEmptyState searchQuery={params.search} />
          ) : (
            <div className="divide-y">
              {hydratedCustomers.map((customer) => (
                <CustomerListItem key={customer.id} customer={customer} searchQuery={params.search} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          {page > 1 ? (
            <Link href={buildPageUrl(page - 1)}>
              <Button variant="outline" size="sm" className="gap-1"><ChevronLeft className="w-4 h-4" />Previous</Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" className="gap-1" disabled><ChevronLeft className="w-4 h-4" />Previous</Button>
          )}
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          {page < totalPages ? (
            <Link href={buildPageUrl(page + 1)}>
              <Button variant="outline" size="sm" className="gap-1">Next<ChevronRight className="w-4 h-4" /></Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" className="gap-1" disabled>Next<ChevronRight className="w-4 h-4" /></Button>
          )}
        </div>
      )}
    </div>
  )
}
