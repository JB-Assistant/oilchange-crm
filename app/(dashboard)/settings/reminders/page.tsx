'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { ReminderToggle } from '@/components/settings/reminder-toggle'
import { QuietHoursForm } from '@/components/settings/quiet-hours-form'
import { ServiceTypeList } from '@/components/settings/service-type-list'
import { TemplateEditor } from '@/components/settings/template-editor'
import { DEFAULT_TEMPLATES } from '@/lib/template-engine'

interface ServiceTypeData {
  name: string
  displayName: string
  category: string
  defaultMileageInterval: number | null
  defaultTimeIntervalDays: number | null
  reminderLeadDays: number
}

export default function ReminderSettingsPage() {
  const { addToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState({ enabled: false, quietStart: 21, quietEnd: 9 })
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeData[]>([])
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES)

  useEffect(() => { loadSettings() }, [])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const [settingsRes, typesRes] = await Promise.all([
        fetch('/api/settings/reminders'),
        fetch('/api/service-types'),
      ])
      if (settingsRes.ok) {
        const data = await settingsRes.json()
        if (data.settings) setSettings(data.settings)
      }
      if (typesRes.ok) {
        const data = await typesRes.json()
        if (Array.isArray(data) && data.length > 0) setServiceTypes(data)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/settings/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, serviceTypes, templates }),
      })
      addToast(response.ok ? 'Settings saved successfully' : 'Failed to save settings', response.ok ? 'success' : 'destructive')
    } catch {
      addToast('An error occurred while saving', 'destructive')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggle = async (enabled: boolean) => {
    setSettings(prev => ({ ...prev, enabled }))
    try {
      const response = await fetch('/api/settings/reminders/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (response.ok) addToast(enabled ? 'SMS Reminders enabled' : 'SMS Reminders disabled', 'success')
    } catch {
      addToast('Failed to update setting', 'destructive')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        </Link>
        <h1 className="text-2xl font-bold">SMS Reminder Settings</h1>
      </div>

      <ReminderToggle enabled={settings.enabled} onToggle={handleToggle} />
      <QuietHoursForm quietStart={settings.quietStart} quietEnd={settings.quietEnd} onChange={(field, value) => setSettings(prev => ({ ...prev, [field]: value }))} />
      <ServiceTypeList serviceTypes={serviceTypes} onUpdate={(index, leadDays) => {
        const updated = [...serviceTypes]
        updated[index] = { ...updated[index], reminderLeadDays: leadDays }
        setServiceTypes(updated)
      }} />
      <TemplateEditor templates={templates} onChange={(field, value) => setTemplates(prev => ({ ...prev, [field]: value }))} />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Changes</>}
        </Button>
      </div>
    </div>
  )
}
