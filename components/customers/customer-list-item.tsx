import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { format } from '@/lib/format'
import Link from 'next/link'
import { Phone, Car, MessageSquare, ChevronRight } from 'lucide-react'

interface ServiceRecord {
  nextDueDate: Date
  nextDueMileage: number
}

interface Vehicle {
  serviceRecords: ServiceRecord[]
}

interface Customer {
  id: string
  firstName: string
  lastName: string
  phone: string
  status: string
  vehicles: Vehicle[]
}

interface CustomerListItemProps {
  customer: Customer
  searchQuery?: string
}

function highlightMatch(text: string, query?: string) {
  if (!query) return text
  const parts = text.split(new RegExp(`(${query})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark>
    ) : part
  )
}

export function CustomerListItem({ customer, searchQuery }: CustomerListItemProps) {
  const latestService = customer.vehicles[0]?.serviceRecords[0]

  return (
    <div className="group flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors">
      <Link href={`/customers/${customer.id}`} className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center font-medium text-zinc-600 flex-shrink-0">
          {customer.firstName[0]}{customer.lastName[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">
            {highlightMatch(`${customer.firstName} ${customer.lastName}`, searchQuery)}
          </p>
          <div className="flex items-center gap-3 text-sm text-zinc-600 flex-wrap">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {format.phone(customer.phone)}
            </span>
            {customer.vehicles.length > 0 && (
              <span className="flex items-center gap-1 hidden sm:inline">
                <Car className="w-3 h-3" />
                {customer.vehicles.length} vehicle{customer.vehicles.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-4">
        <div className="text-right hidden md:block">
          {latestService ? (
            <>
              <p className="text-sm font-medium">Next due: {format.date(latestService.nextDueDate)}</p>
              <p className="text-xs text-zinc-600">{format.mileage(latestService.nextDueMileage)}</p>
            </>
          ) : (
            <p className="text-sm text-zinc-500">No service records</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <a href={`tel:${customer.phone}`}>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Phone className="w-4 h-4" /></Button>
            </a>
            <Link href={`/customers/${customer.id}/sms`}>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><MessageSquare className="w-4 h-4" /></Button>
            </Link>
          </div>
          <StatusBadge status={customer.status as never} />
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </div>
      </div>
    </div>
  )
}
