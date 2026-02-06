import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { CustomerStatus } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/status-badge'
import { format } from '@/lib/format'
import Link from 'next/link'
import { 
  Search, 
  Plus, 
  Phone, 
  Car,
  Filter
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CustomersPageProps {
  searchParams: Promise<{ 
    status?: CustomerStatus
    search?: string 
  }>
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const { orgId } = await auth()
  const params = await searchParams
  
  if (!orgId) {
    redirect('/')
  }

  const statusFilter = params.status
  const searchQuery = params.search

  const where: any = { orgId }
  
  if (statusFilter) {
    where.status = statusFilter
  }
  
  if (searchQuery) {
    where.OR = [
      { firstName: { contains: searchQuery, mode: 'insensitive' } },
      { lastName: { contains: searchQuery, mode: 'insensitive' } },
      { phone: { contains: searchQuery } },
      { email: { contains: searchQuery, mode: 'insensitive' } }
    ]
  }

  const customers = await prisma.customer.findMany({
    where,
    include: {
      vehicles: {
        include: {
          serviceRecords: {
            orderBy: { serviceDate: 'desc' },
            take: 1
          }
        }
      }
    },
    orderBy: [
      { status: 'asc' },
      { createdAt: 'desc' }
    ]
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-zinc-600 mt-1">Manage your customer base and service records</p>
        </div>
        <Link href="/customers/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <form className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input 
                  name="search"
                  placeholder="Search by name, phone, or email..."
                  className="pl-9"
                  defaultValue={searchQuery}
                />
              </div>
              <Button type="submit" variant="secondary">Search</Button>
            </form>
            <form className="flex gap-2">
              <Select name="status" defaultValue={statusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value={CustomerStatus.overdue}>Overdue</SelectItem>
                  <SelectItem value={CustomerStatus.due_now}>Due Now</SelectItem>
                  <SelectItem value={CustomerStatus.due_soon}>Due Soon</SelectItem>
                  <SelectItem value={CustomerStatus.up_to_date}>Up to Date</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" variant="outline">Filter</Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers ({customers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
              <p className="text-zinc-600 mb-4">No customers found</p>
              <Link href="/customers/new">
                <Button>Add Your First Customer</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {customers.map((customer) => {
                const latestService = customer.vehicles[0]?.serviceRecords[0]
                
                return (
                  <Link 
                    key={customer.id} 
                    href={`/customers/${customer.id}`}
                    className="flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center font-medium text-zinc-600">
                        {customer.firstName[0]}{customer.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium">
                          {customer.firstName} {customer.lastName}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-zinc-600">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {format.phone(customer.phone)}
                          </span>
                          {customer.vehicles.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Car className="w-3 h-3" />
                              {customer.vehicles.length} vehicle{customer.vehicles.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        {latestService ? (
                          <>
                            <p className="text-sm font-medium">
                              Next due: {format.date(latestService.nextDueDate)}
                            </p>
                            <p className="text-xs text-zinc-600">
                              {format.mileage(latestService.nextDueMileage)}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-zinc-500">No service records</p>
                        )}
                      </div>
                      <StatusBadge status={customer.status} />
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

import { Users } from 'lucide-react'
