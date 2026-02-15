'use client'

import { Badge } from '@/components/ui/badge'
import { Phone, AlertTriangle } from 'lucide-react'
import { format } from '@/lib/format'

interface SmsCustomerInfoProps {
  firstName: string
  lastName: string
  phone: string
  smsConsent: boolean
}

export function SmsCustomerInfo({ firstName, lastName, phone, smsConsent }: SmsCustomerInfoProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center font-medium text-zinc-600">
            {firstName[0]}{lastName[0]}
          </div>
          <div>
            <p className="font-medium">{firstName} {lastName}</p>
            <p className="text-sm text-zinc-600 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {format.phone(phone)}
            </p>
          </div>
        </div>
        <Badge variant={smsConsent ? 'default' : 'destructive'}>
          {smsConsent ? 'Opted In' : 'Not Opted In'}
        </Badge>
      </div>

      {!smsConsent && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          This customer has not opted in to SMS. Sending may violate compliance rules.
        </div>
      )}
    </>
  )
}
