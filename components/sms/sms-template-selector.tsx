'use client'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DEFAULT_TEMPLATES } from '@/lib/template-engine'

export const BUILT_IN_TEMPLATES = [
  { id: 'builtin_first', name: 'First Reminder', body: DEFAULT_TEMPLATES.firstReminder },
  { id: 'builtin_due', name: 'Due Date Reminder', body: DEFAULT_TEMPLATES.dueDateReminder },
  { id: 'builtin_overdue', name: 'Overdue Reminder', body: DEFAULT_TEMPLATES.overdueReminder },
]

interface SmsTemplateSelectorProps {
  selectedId: string
  customTemplates: { id: string; name: string; body: string }[]
  onChange: (templateId: string) => void
}

export function SmsTemplateSelector({ selectedId, customTemplates, onChange }: SmsTemplateSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Template</Label>
      <Select value={selectedId} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Choose a template..." />
        </SelectTrigger>
        <SelectContent>
          {BUILT_IN_TEMPLATES.map((t) => (
            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
          ))}
          {customTemplates.length > 0 && (
            <>
              <SelectItem disabled value="__divider__">── Custom Templates ──</SelectItem>
              {customTemplates.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </>
          )}
          <SelectItem value="custom">Custom Message</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
