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
import { assertSupabaseError, buildSearchPattern } from '@/lib/supabase/otto'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'

const PAGE_SIZE = 25

interface CustomersPageProps {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>
}

interface CustomerRow {
  id: string
  first_name: string
  last_name: string
  phone: string
  status: string
  created_at: string
}

interface VehicleRow {
  id: string
  customer_id: string
}

interface ServiceRow {
  vehicle_id: string
  next_due_date: string
  next_due_mileage: number
  service_date: string
}

function isCustomerStatus(value: string | undefined): value is CustomerStatus {
  if (!value) return false
  return Object.values(CustomerStatusValues).includes(value as CustomerStatus)
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const { orgId: clerkOrgId } = await auth()
  const params = await searchParams
  if (!clerkOrgId) redirect('/')

  const orgId = await resolveOrgId(clerkOrgId)
  const db = await createProductAdminClient()
  const page = Math.max(1, parseInt(params.page || '1', 10))

  let customersQuery = db
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('status', { ascending: true })
    .order('created_at', { ascending: false })

  if (isCustomerStatus(params.status)) {
    customersQuery = customersQuery.eq('status', params.status)
  }

  if (params.search) {
    const pattern = buildSearchPattern(params.search)
    customersQuery = customersQuery.or(
      `first_name.ilike.${pattern},last_name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`
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
      .select('id, customer_id')
      .in('customer_id', customerIds)
    assertSupabaseError(vehicleError, 'Failed to fetch customer vehicles')
    vehicles = (vehicleRows ?? []) as VehicleRow[]

    const vehicleIds = vehicles.map((vehicle) => vehicle.id)
    if (vehicleIds.length > 0) {
      const { data: serviceRows, error: serviceError } = await db
        .from('repair_orders')
        .select('vehicle_id, next_due_date, next_due_mileage, service_date')
        .in('vehicle_id', vehicleIds)
        .order('service_date', { ascending: false })
      assertSupabaseError(serviceError, 'Failed to fetch service records')
      serviceRecords = (serviceRows ?? []) as ServiceRow[]
    }
  }

  const latestServiceByVehicle = new Map<string, ServiceRow>()
  for (const record of serviceRecords) {
    if (!latestServiceByVehicle.has(record.vehicle_id)) {
      latestServiceByVehicle.set(record.vehicle_id, record)
    }
  }

  const vehiclesByCustomer = new Map<string, Array<{ serviceRecords: Array<{ nextDueDate: Date; nextDueMileage: number }> }>>()
  for (const vehicle of vehicles) {
    const latestService = latestServiceByVehicle.get(vehicle.id)
    const normalizedVehicle = {
      serviceRecords: latestService ? [{
        nextDueDate: new Date(latestService.next_due_date),
        nextDueMileage: latestService.next_due_mileage,
      }] : [],
    }

    const existing = vehiclesByCustomer.get(vehicle.customer_id)
    if (existing) {
      existing.push(normalizedVehicle)
    } else {
      vehiclesByCustomer.set(vehicle.customer_id, [normalizedVehicle])
    }
  }

  const hydratedCustomers = customers.map((customer) => ({
    id: customer.id,
    firstName: customer.first_name,
    lastName: customer.last_name,
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
