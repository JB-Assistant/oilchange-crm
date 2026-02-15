'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Bell } from 'lucide-react'

interface ReminderToggleProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
}

export function ReminderToggle({ enabled, onToggle }: ReminderToggleProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Enable SMS Reminders
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Turn on automatic SMS reminders for all customers who have opted in.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </CardContent>
    </Card>
  )
}
