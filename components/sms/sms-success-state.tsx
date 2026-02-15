'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'
import { format } from '@/lib/format'
import Link from 'next/link'

interface SmsSuccessStateProps {
  customerId: string
  phone: string
  onSendAnother: () => void
}

export function SmsSuccessState({ customerId, phone, onSendAnother }: SmsSuccessStateProps) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-1">Message Sent</h2>
        <p className="text-sm text-zinc-600 mb-6">SMS sent to {format.phone(phone)}</p>
        <div className="flex gap-3 justify-center">
          <Link href={`/customers/${customerId}`}>
            <Button variant="outline">Back to Customer</Button>
          </Link>
          <Button onClick={onSendAnother}>Send Another</Button>
        </div>
      </CardContent>
    </Card>
  )
}
