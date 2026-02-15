export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { CustomerStatus, Prisma } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { CustomerFilters } from '@/components/customers/customer-filters'
import { CustomerListItem } from '@/components/customers/customer-list-item'
import { CustomerEmptyState } from '@/components/customers/customer-empty-state'

const PAGE_SIZE = 25

interface CustomersPageProps {
  searchParams: Promise<{ status?: CustomerStatus; search?: string; page?: string }>
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const { orgId } = await auth()
  const params = await searchParams
  if (!orgId) redirect('/')

  const page = Math.max(1, parseInt(params.page || '1'))
  const where: Prisma.CustomerWhereInput = { orgId }

  if (params.status && params.status !== ('all' as CustomerStatus)) {
    where.status = params.status
  }

  if (params.search) {
    where.OR = [
      { firstName: { contains: params.search, mode: 'insensitive' } },
      { lastName: { contains: params.search, mode: 'insensitive' } },
      { phone: { contains: params.search } },
      { email: { contains: params.search, mode: 'insensitive' } }
    ]
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        vehicles: { include: { serviceRecords: { orderBy: { serviceDate: 'desc' }, take: 1 } } }
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.customer.count({ where }),
  ])

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
          {customers.length === 0 ? (
            <CustomerEmptyState searchQuery={params.search} />
          ) : (
            <div className="divide-y">
              {customers.map((customer) => (
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
