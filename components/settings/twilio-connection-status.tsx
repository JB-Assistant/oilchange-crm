'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Phone, CheckCircle2, XCircle } from 'lucide-react'

interface TwilioConnectionStatusProps {
  phoneNumber?: string
  isActive: boolean
}

export function TwilioConnectionStatus({ phoneNumber, isActive }: TwilioConnectionStatusProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5" />
            <div>
              <h2 className="font-semibold">Connection Status</h2>
              <p className="text-sm text-zinc-500">
                {isActive ? `Connected — ${phoneNumber}` : 'Not configured'}
              </p>
            </div>
          </div>
          {isActive ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" /><span className="text-sm font-medium">Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-400">
              <XCircle className="w-5 h-5" /><span className="text-sm font-medium">Inactive</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
