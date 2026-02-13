'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { renderTemplate, DEFAULT_TEMPLATES } from '@/lib/template-engine'
import { format } from '@/lib/format'
import Link from 'next/link'
import {
  Phone,
  Send,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  XCircle,
} from 'lucide-react'

interface VehicleInfo {
  id: string
  year: number
  make: string
  model: string
  latestService: {
    id: string
    serviceType: string
    nextDueDate: string
  } | null
}

interface SmsComposeFormProps {
  customer: {
    id: string
    firstName: string
    lastName: string
    phone: string
    smsConsent: boolean
  }
  vehicles: VehicleInfo[]
  org: { name: string; phone: string }
  templates: { id: string; name: string; body: string }[]
  twilioActive: boolean
}

type SendState = 'idle' | 'sending' | 'sent' | 'error'

const BUILT_IN_TEMPLATES = [
  { id: 'builtin_first', name: 'First Reminder', body: DEFAULT_TEMPLATES.firstReminder },
  { id: 'builtin_due', name: 'Due Date Reminder', body: DEFAULT_TEMPLATES.dueDateReminder },
  { id: 'builtin_overdue', name: 'Overdue Reminder', body: DEFAULT_TEMPLATES.overdueReminder },
]

export function SmsComposeForm({
  customer,
  vehicles,
  org,
  templates,
  twilioActive,
}: SmsComposeFormProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id ?? '')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [sendState, setSendState] = useState<SendState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null
  const allTemplates = [...BUILT_IN_TEMPLATES, ...templates]

  const templateData = useMemo(() => {
    const data: Record<string, string | number> = {
      firstName: customer.firstName,
      lastName: customer.lastName,
      shopName: org.name,
      shopPhone: org.phone,
    }
    if (selectedVehicle) {
      data.vehicleYear = selectedVehicle.year
      data.vehicleMake = selectedVehicle.make
      data.vehicleModel = selectedVehicle.model
      if (selectedVehicle.latestService) {
        data.serviceType = selectedVehicle.latestService.serviceType === 'oil_change'
          ? 'Oil Change'
          : selectedVehicle.latestService.serviceType
        data.dueDate = format.date(selectedVehicle.latestService.nextDueDate)
      }
    }
    return data
  }, [customer, org, selectedVehicle])

  function handleTemplateChange(templateId: string) {
    setSelectedTemplateId(templateId)
    if (templateId === 'custom') {
      setMessageBody('')
      return
    }
    const tmpl = allTemplates.find((t) => t.id === templateId)
    if (tmpl) {
      setMessageBody(renderTemplate(tmpl.body, templateData))
    }
  }

  function handleVehicleChange(vehicleId: string) {
    setSelectedVehicleId(vehicleId)
    // Re-render template with new vehicle data if a template is selected
    if (selectedTemplateId && selectedTemplateId !== 'custom') {
      const tmpl = allTemplates.find((t) => t.id === selectedTemplateId)
      if (tmpl) {
        const newVehicle = vehicles.find((v) => v.id === vehicleId) ?? null
        const newData: Record<string, string | number> = {
          firstName: customer.firstName,
          lastName: customer.lastName,
          shopName: org.name,
          shopPhone: org.phone,
        }
        if (newVehicle) {
          newData.vehicleYear = newVehicle.year
          newData.vehicleMake = newVehicle.make
          newData.vehicleModel = newVehicle.model
          if (newVehicle.latestService) {
            newData.serviceType = newVehicle.latestService.serviceType === 'oil_change'
              ? 'Oil Change'
              : newVehicle.latestService.serviceType
            newData.dueDate = format.date(newVehicle.latestService.nextDueDate)
          }
        }
        setMessageBody(renderTemplate(tmpl.body, newData))
      }
    }
  }

  async function handleSend() {
    if (!messageBody.trim()) return

    setSendState('sending')
    setErrorMessage('')

    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          body: messageBody.trim(),
          vehicleId: selectedVehicleId || undefined,
          serviceRecordId: selectedVehicle?.latestService?.id || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send message')
      }

      setSendState('sent')
    } catch (err) {
      setSendState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send message')
    }
  }

  const charCount = messageBody.length
  const segments = Math.ceil(charCount / 160) || 0

  if (sendState === 'sent') {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-1">Message Sent</h2>
          <p className="text-sm text-zinc-600 mb-6">
            SMS sent to {format.phone(customer.phone)}
          </p>
          <div className="flex gap-3 justify-center">
            <Link href={`/customers/${customer.id}`}>
              <Button variant="outline">Back to Customer</Button>
            </Link>
            <Button onClick={() => {
              setSendState('idle')
              setMessageBody('')
              setSelectedTemplateId('')
            }}>
              Send Another
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Customer info bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center font-medium text-zinc-600">
              {customer.firstName[0]}{customer.lastName[0]}
            </div>
            <div>
              <p className="font-medium">{customer.firstName} {customer.lastName}</p>
              <p className="text-sm text-zinc-600 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {format.phone(customer.phone)}
              </p>
            </div>
          </div>
          <Badge variant={customer.smsConsent ? 'default' : 'destructive'}>
            {customer.smsConsent ? 'Opted In' : 'Not Opted In'}
          </Badge>
        </div>

        {!customer.smsConsent && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            This customer has not opted in to SMS. Sending may violate compliance rules.
          </div>
        )}

        {/* Vehicle selector */}
        {vehicles.length > 1 && (
          <div className="space-y-2">
            <Label>Vehicle</Label>
            <Select value={selectedVehicleId} onValueChange={handleVehicleChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.year} {v.make} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {vehicles.length === 1 && selectedVehicle && (
          <div className="text-sm text-zinc-600">
            Vehicle: {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
          </div>
        )}

        {/* Template selector */}
        <div className="space-y-2">
          <Label>Template</Label>
          <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a template..." />
            </SelectTrigger>
            <SelectContent>
              {BUILT_IN_TEMPLATES.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
              {templates.length > 0 && (
                <>
                  <SelectItem disabled value="__divider__">
                    ── Custom Templates ──
                  </SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </>
              )}
              <SelectItem value="custom">Custom Message</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Message body */}
        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder="Type your message or select a template above..."
            rows={5}
            className="resize-none"
          />
          <div className="flex justify-between text-xs text-zinc-500">
            <span>
              {charCount} character{charCount !== 1 ? 's' : ''}
              {segments > 1 && (
                <span className="text-amber-600 ml-1">
                  ({segments} SMS segments)
                </span>
              )}
            </span>
            <span>160 chars per segment</span>
          </div>
        </div>

        {/* Error banner */}
        {sendState === 'error' && (
          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Link href={`/customers/${customer.id}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            onClick={handleSend}
            disabled={!messageBody.trim() || !twilioActive || sendState === 'sending'}
            className="gap-2"
          >
            {sendState === 'sending' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send SMS
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
