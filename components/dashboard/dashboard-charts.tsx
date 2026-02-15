'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { ServiceTrendChart } from './charts/service-trend-chart'
import { CustomerGrowthChart } from './charts/customer-growth-chart'
import { SmsDeliveryChart } from './charts/sms-delivery-chart'
import { StatusDistributionChart } from './charts/status-distribution-chart'

interface TrendsData {
  customerGrowth: { month: string; count: number }[]
  servicesByMonth: { month: string; count: number }[]
  smsStats: { delivered: number; sent: number; failed: number; queued: number }
  statusDistribution: { status: string; count: number }[]
}

export function DashboardCharts() {
  const [data, setData] = useState<TrendsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/trends?days=365')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ServiceTrendChart data={data.servicesByMonth} />
      <CustomerGrowthChart data={data.customerGrowth} />
      <SmsDeliveryChart data={data.smsStats} />
      <StatusDistributionChart data={data.statusDistribution} />
    </div>
  )
}
