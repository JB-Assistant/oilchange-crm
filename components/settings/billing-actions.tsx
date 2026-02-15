'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface BillingActionsProps {
  currentTier: string
  hasStripeCustomer: boolean
}

export function BillingActions({ currentTier, hasStripeCustomer }: BillingActionsProps) {
  const { addToast } = useToast()
  const [upgrading, setUpgrading] = useState(false)
  const [managingBilling, setManagingBilling] = useState(false)

  const handleUpgrade = async () => {
    setUpgrading(true)
    try {
      const targetTier = currentTier === 'starter' ? 'pro' : 'business'
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: targetTier }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      addToast('Failed to start checkout', 'destructive')
    } finally {
      setUpgrading(false)
    }
  }

  const handleBilling = async () => {
    setManagingBilling(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      addToast('Failed to open billing portal', 'destructive')
    } finally {
      setManagingBilling(false)
    }
  }

  return (
    <div className="flex gap-3">
      {currentTier !== 'business' && (
        <Button className="flex-1" onClick={handleUpgrade} disabled={upgrading}>
          {upgrading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</> : 'Upgrade Plan'}
        </Button>
      )}
      <Button variant="outline" className="flex-1" onClick={handleBilling} disabled={!hasStripeCustomer || managingBilling}>
        {managingBilling ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Loading...</> : 'View Billing'}
      </Button>
    </div>
  )
}
