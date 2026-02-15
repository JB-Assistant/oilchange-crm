'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { MessageSquare } from 'lucide-react'

interface Templates {
  twoWeeksBefore: string
  oneWeekBefore: string
  dueDateReminder: string
  oneWeekOverdue: string
  twoWeeksOverdue: string
  // Legacy aliases
  firstReminder?: string
  overdueReminder?: string
}

interface TemplateEditorProps {
  templates: Templates
  onChange: (field: keyof Templates, value: string) => void
}

const TEMPLATE_FIELDS: { key: keyof Templates; label: string; hint: string }[] = [
  { key: 'twoWeeksBefore', label: '2 Weeks Before Due', hint: 'Sent 14 days before service is due' },
  { key: 'oneWeekBefore', label: '1 Week Before Due', hint: 'Sent 7 days before service is due' },
  { key: 'dueDateReminder', label: 'Due Date', hint: 'Sent on the day service is due' },
  { key: 'oneWeekOverdue', label: '1 Week Overdue', hint: 'Sent 7 days after service was due' },
  { key: 'twoWeeksOverdue', label: '2 Weeks Overdue', hint: 'Sent 14 days after service was due' },
]

export function TemplateEditor({ templates, onChange }: TemplateEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Message Templates (5-step sequence)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-xs text-zinc-500">
          Variables: {'{{firstName}}'}, {'{{serviceType}}'}, {'{{dueDate}}'}, {'{{shopName}}'}, {'{{shopPhone}}'}, {'{{vehicleYear}}'}, {'{{vehicleMake}}'}
        </p>
        {TEMPLATE_FIELDS.map(({ key, label, hint }) => (
          <div key={key}>
            <div className="flex items-center justify-between">
              <Label>{label}</Label>
              <span className="text-xs text-zinc-400">{hint}</span>
            </div>
            <textarea
              value={templates[key] || ''}
              onChange={(e) => onChange(key, e.target.value)}
              className="w-full mt-2 p-3 border rounded-lg min-h-[80px] text-sm"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
