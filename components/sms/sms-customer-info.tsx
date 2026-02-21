'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { Phone, AlertTriangle, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react'
import { format } from '@/lib/format'

interface SmsCustomerInfoProps {
  firstName: string
  lastName: string
  phone: string
  smsConsent: boolean
  customerId: string
  onConsentChange: (newConsent: boolean) => void
}

export function SmsCustomerInfo({
  firstName, lastName, phone, smsConsent, customerId, onConsentChange,
}: SmsCustomerInfoProps) {
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  async function toggleConsent(optIn: boolean) {
    setLoading(true)
    try {
      const res = await fetch(`/api/consent/${customerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: optIn ? 'opt_in' : 'opt_out' }),
      })
      if (!res.ok) throw new Error('Failed to update consent')
      onConsentChange(optIn)
      addToast(optIn ? 'Customer opted in to SMS' : 'Customer opted out of SMS', 'success')
    } catch {
      addToast('Failed to update SMS consent', 'destructive')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center font-medium text-zinc-600 dark:text-zinc-300">
            {firstName[0]}{lastName[0]}
          </div>
          <div>
            <p className="font-medium">{firstName} {lastName}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {format.phone(phone)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={smsConsent ? 'default' : 'destructive'} className="flex items-center gap-1">
            {smsConsent
              ? <><ShieldCheck className="w-3 h-3" /> Opted In</>
              : <><ShieldOff className="w-3 h-3" /> Not Opted In</>}
          </Badge>
          {loading
            ? <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
            : <Switch checked={smsConsent} onCheckedChange={(checked) => toggleConsent(checked)} disabled={loading} />}
        </div>
      </div>

      {!smsConsent && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">This customer has not opted in to SMS. Sending may violate compliance rules.</span>
          <Button
            size="sm"
            variant="outline"
            className="min-h-[44px] min-w-[44px] shrink-0 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            disabled={loading}
            onClick={() => toggleConsent(true)}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Opt In Now
          </Button>
        </div>
      )}
    </>
  )
}
