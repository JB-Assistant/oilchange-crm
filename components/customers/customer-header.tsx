'use client'

import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { CustomerStatus } from '@/lib/db/enums'
import Link from 'next/link'
import { ArrowLeft, Phone, MessageSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { EditCustomerDialog } from './edit-customer-dialog'
import { DeleteCustomerDialog } from './delete-customer-dialog'

interface CustomerHeaderProps {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  status: CustomerStatus
  vehicleCount: number
}

export function CustomerHeader({ id, firstName, lastName, phone, email, status, vehicleCount }: CustomerHeaderProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{firstName} {lastName}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={status} />
            <span className="text-sm text-zinc-600">
              {vehicleCount} vehicle{vehicleCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Link href={`tel:${phone}`}>
          <Button variant="outline" className="gap-2"><Phone className="w-4 h-4" />Call</Button>
        </Link>
        <Link href={`/customers/${id}/sms`}>
          <Button variant="outline" className="gap-2"><MessageSquare className="w-4 h-4" />SMS</Button>
        </Link>
        <EditCustomerDialog
          customer={{ id, firstName, lastName, phone, email }}
          onSuccess={() => router.refresh()}
        />
        <DeleteCustomerDialog
          customer={{ id, firstName, lastName }}
          onSuccess={() => router.refresh()}
        />
      </div>
    </div>
  )
}
