'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function formatHour(h: number): string {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

interface QuietHoursFormProps {
  quietStart: number
  quietEnd: number
  onChange: (field: 'quietStart' | 'quietEnd', value: number) => void
}

export function QuietHoursForm({ quietStart, quietEnd, onChange }: QuietHoursFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiet Hours</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-zinc-500">SMS messages will not be sent during these hours.</p>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label>Start</Label>
            <Select value={quietStart.toString()} onValueChange={(v) => onChange('quietStart', parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => (
                  <SelectItem key={i} value={i.toString()}>{formatHour(i)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label>End</Label>
            <Select value={quietEnd.toString()} onValueChange={(v) => onChange('quietEnd', parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => (
                  <SelectItem key={i} value={i.toString()}>{formatHour(i)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
