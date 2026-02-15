'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { renderTemplate } from '@/lib/template-engine'
import { format } from '@/lib/format'
import Link from 'next/link'
import { Send, Loader2, XCircle } from 'lucide-react'
import { SmsSuccessState } from '@/components/sms/sms-success-state'
import { SmsCustomerInfo } from '@/components/sms/sms-customer-info'
import { SmsTemplateSelector, BUILT_IN_TEMPLATES } from '@/components/sms/sms-template-selector'

interface VehicleInfo {
  id: string
  year: number
  make: string
  model: string
  latestService: { id: string; serviceType: string; nextDueDate: string } | null
}

interface SmsComposeFormProps {
  customer: { id: string; firstName: string; lastName: string; phone: string; smsConsent: boolean }
  vehicles: VehicleInfo[]
  org: { name: string; phone: string }
  templates: { id: string; name: string; body: string }[]
  twilioActive: boolean
}

type SendState = 'idle' | 'sending' | 'sent' | 'error'

function buildTemplateData(customer: SmsComposeFormProps['customer'], org: SmsComposeFormProps['org'], vehicle: VehicleInfo | null) {
  const data: Record<string, string | number> = {
    firstName: customer.firstName,
    lastName: customer.lastName,
    shopName: org.name,
    shopPhone: org.phone,
  }
  if (vehicle) {
    data.vehicleYear = vehicle.year
    data.vehicleMake = vehicle.make
    data.vehicleModel = vehicle.model
    if (vehicle.latestService) {
      data.serviceType = vehicle.latestService.serviceType === 'oil_change' ? 'Oil Change' : vehicle.latestService.serviceType
      data.dueDate = format.date(vehicle.latestService.nextDueDate)
    }
  }
  return data
}

export function SmsComposeForm({ customer, vehicles, org, templates, twilioActive }: SmsComposeFormProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id ?? '')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [sendState, setSendState] = useState<SendState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null
  const allTemplates = [...BUILT_IN_TEMPLATES, ...templates]
  const templateData = useMemo(() => buildTemplateData(customer, org, selectedVehicle), [customer, org, selectedVehicle])

  function handleTemplateChange(templateId: string) {
    setSelectedTemplateId(templateId)
    if (templateId === 'custom') { setMessageBody(''); return }
    const tmpl = allTemplates.find((t) => t.id === templateId)
    if (tmpl) setMessageBody(renderTemplate(tmpl.body, templateData))
  }

  function handleVehicleChange(vehicleId: string) {
    setSelectedVehicleId(vehicleId)
    if (selectedTemplateId && selectedTemplateId !== 'custom') {
      const tmpl = allTemplates.find((t) => t.id === selectedTemplateId)
      const newVehicle = vehicles.find((v) => v.id === vehicleId) ?? null
      if (tmpl) setMessageBody(renderTemplate(tmpl.body, buildTemplateData(customer, org, newVehicle)))
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
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to send message') }
      setSendState('sent')
    } catch (err) {
      setSendState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send message')
    }
  }

  const charCount = messageBody.length
  const segments = Math.ceil(charCount / 160) || 0

  if (sendState === 'sent') {
    return <SmsSuccessState customerId={customer.id} phone={customer.phone} onSendAnother={() => { setSendState('idle'); setMessageBody(''); setSelectedTemplateId('') }} />
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <SmsCustomerInfo firstName={customer.firstName} lastName={customer.lastName} phone={customer.phone} smsConsent={customer.smsConsent} />

        {vehicles.length > 1 && (
          <div className="space-y-2">
            <Label>Vehicle</Label>
            <Select value={selectedVehicleId} onValueChange={handleVehicleChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.year} {v.make} {v.model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {vehicles.length === 1 && selectedVehicle && (
          <div className="text-sm text-zinc-600">Vehicle: {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</div>
        )}

        <SmsTemplateSelector selectedId={selectedTemplateId} customTemplates={templates} onChange={handleTemplateChange} />

        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea value={messageBody} onChange={(e) => setMessageBody(e.target.value)} placeholder="Type your message or select a template above..." rows={5} className="resize-none" />
          <div className="flex justify-between text-xs text-zinc-500">
            <span>{charCount} character{charCount !== 1 ? 's' : ''}{segments > 1 && <span className="text-amber-600 ml-1">({segments} SMS segments)</span>}</span>
            <span>160 chars per segment</span>
          </div>
        </div>

        {sendState === 'error' && (
          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            <XCircle className="w-4 h-4 flex-shrink-0" />{errorMessage}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link href={`/customers/${customer.id}`}><Button variant="outline">Cancel</Button></Link>
          <Button onClick={handleSend} disabled={!messageBody.trim() || !twilioActive || sendState === 'sending'} className="gap-2">
            {sendState === 'sending' ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</> : <><Send className="w-4 h-4" />Send SMS</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
