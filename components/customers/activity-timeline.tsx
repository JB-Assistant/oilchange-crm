'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Wrench, Phone, MessageSquare, ShieldCheck, StickyNote } from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'service' | 'follow_up' | 'reminder' | 'consent' | 'note'
  title: string
  description: string
  date: string
}

const TYPE_CONFIG = {
  service: { icon: Wrench, color: 'text-blue-500 bg-blue-50' },
  follow_up: { icon: Phone, color: 'text-amber-500 bg-amber-50' },
  reminder: { icon: MessageSquare, color: 'text-green-500 bg-green-50' },
  consent: { icon: ShieldCheck, color: 'text-purple-500 bg-purple-50' },
  note: { icon: StickyNote, color: 'text-zinc-500 bg-zinc-100' },
} as const

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface ActivityTimelineProps {
  customerId: string
}

export function ActivityTimeline({ customerId }: ActivityTimelineProps) {
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/customers/${customerId}/activity`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setActivity(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [customerId])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </CardContent>
      </Card>
    )
  }

  if (activity.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-zinc-500">
          No activity recorded yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-zinc-200" />
          <div className="space-y-4">
            {activity.map((item) => {
              const config = TYPE_CONFIG[item.type]
              const Icon = config.icon
              return (
                <div key={item.id} className="flex gap-4 relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-zinc-400 whitespace-nowrap">{formatDate(item.date)}</p>
                    </div>
                    <p className="text-sm text-zinc-500 truncate">{item.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
