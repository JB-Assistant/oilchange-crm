'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Bell, 
  ArrowLeft, 
  Loader2,
  Save,
  MessageSquare
} from 'lucide-react'

const DEFAULT_SERVICE_TYPES = [
  { name: 'oil_change_conventional', displayName: 'Oil Change (Conventional)', defaultMileageInterval: 5000, defaultTimeIntervalDays: 90, reminderLeadDays: 14 },
  { name: 'oil_change_synthetic', displayName: 'Oil Change (Synthetic)', defaultMileageInterval: 7500, defaultTimeIntervalDays: 180, reminderLeadDays: 14 },
  { name: 'tire_rotation', displayName: 'Tire Rotation', defaultMileageInterval: 7500, defaultTimeIntervalDays: 180, reminderLeadDays: 14 },
  { name: 'state_inspection', displayName: 'State Inspection', defaultMileageInterval: null, defaultTimeIntervalDays: 365, reminderLeadDays: 30 },
]

const DEFAULT_TEMPLATES = {
  firstReminder: `Hi {{firstName}}, this is {{shopName}}. Your {{serviceType}} is coming up around {{dueDate}}. Call us at {{shopPhone}} or reply BOOK to schedule. Reply STOP to opt out.`,
  dueDateReminder: `Hi {{firstName}}, your {{serviceType}} is due now! {{shopName}} has openings this week. Call {{shopPhone}} or reply BOOK. Reply STOP to opt out.`,
  overdueReminder: `Hi {{firstName}}, your {{serviceType}} is overdue. Keeping up with maintenance protects your {{vehicleYear}} {{vehicleMake}}. Call {{shopName}} at {{shopPhone}}. Reply STOP to opt out.`,
}

export default function ReminderSettingsPage() {
  const { addToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState({
    enabled: false,
    quietStart: 21,
    quietEnd: 9,
  })
  const [serviceTypes, setServiceTypes] = useState(DEFAULT_SERVICE_TYPES)
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/settings/reminders')
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setSettings(data.settings)
        }
        if (data.serviceTypes) {
          setServiceTypes(data.serviceTypes)
        }
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

      if (response.ok) {
        addToast('Settings saved successfully', 'success')
      } else {
        addToast('Failed to save settings', 'destructive')
      }
    } catch (error) {
      addToast('An error occurred while saving', 'destructive')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleEnabled = async (enabled: boolean) => {
    setSettings(prev => ({ ...prev, enabled }))
    
    try {
      const response = await fetch('/api/settings/reminders/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })

      if (response.ok) {
        addToast(enabled ? 'SMS Reminders enabled' : 'SMS Reminders disabled', 'success')
      }
    } catch (error) {
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
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">SMS Reminder Settings</h1>
      </div>

      {/* Global Toggle */}
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
            <Switch 
              checked={settings.enabled}
              onCheckedChange={handleToggleEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Quiet Hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-500">
            SMS messages will not be sent during these hours.
          </p>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Start</Label>
              <Select 
                value={settings.quietStart.toString()}
                onValueChange={(v) => setSettings(prev => ({ ...prev, quietStart: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>End</Label>
              <Select 
                value={settings.quietEnd.toString()}
                onValueChange={(v) => setSettings(prev => ({ ...prev, quietEnd: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Types */}
      <Card>
        <CardHeader>
          <CardTitle>Service Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {serviceTypes.map((type, index) => (
              <div key={type.name} className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg">
                <div>
                  <p className="font-medium">{type.displayName}</p>
                  <p className="text-sm text-zinc-500">
                    Every {type.defaultMileageInterval?.toLocaleString()} miles or {type.defaultTimeIntervalDays} days
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <Label className="text-xs">Remind days before</Label>
                    <Input 
                      type="number"
                      value={type.reminderLeadDays}
                      onChange={(e) => {
                        const newTypes = [...serviceTypes]
                        newTypes[index].reminderLeadDays = parseInt(e.target.value) || 14
                        setServiceTypes(newTypes)
                      }}
                      className="w-24"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Message Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Message Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>First Reminder</Label>
            <textarea
              value={templates.firstReminder}
              onChange={(e) => setTemplates(prev => ({ ...prev, firstReminder: e.target.value }))}
              className="w-full mt-2 p-3 border rounded-lg min-h-[100px] text-sm"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Variables: {'{{firstName}}'}, {'{{serviceType}}'}, {'{{dueDate}}'}, {'{{shopName}}'}, {'{{shopPhone}}'}
            </p>
          </div>
          <div>
            <Label>Due Date Reminder</Label>
            <textarea
              value={templates.dueDateReminder}
              onChange={(e) => setTemplates(prev => ({ ...prev, dueDateReminder: e.target.value }))}
              className="w-full mt-2 p-3 border rounded-lg min-h-[100px] text-sm"
            />
          </div>
          <div>
            <Label>Overdue Reminder</Label>
            <textarea
              value={templates.overdueReminder}
              onChange={(e) => setTemplates(prev => ({ ...prev, overdueReminder: e.target.value }))}
              className="w-full mt-2 p-3 border rounded-lg min-h-[100px] text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
