'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Loader2, SendHorizontal } from 'lucide-react'
import { TwilioConnectionStatus } from '@/components/settings/twilio-connection-status'
import { TwilioCredentialsForm } from '@/components/settings/twilio-credentials-form'

interface TwilioConfigData {
  id: string
  accountSid: string
  phoneNumber: string
  isActive: boolean
}

export default function SMSSettingsPage() {
  const { addToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [config, setConfig] = useState<TwilioConfigData | null>(null)
  const [accountSid, setAccountSid] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [testPhone, setTestPhone] = useState('')

  useEffect(() => { loadConfig() }, [])

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/twilio-config')
      if (res.ok) {
        const data = await res.json()
        if (data) { setConfig(data); setAccountSid(data.accountSid); setPhoneNumber(data.phoneNumber) }
      }
    } catch { console.error('Failed to load Twilio config') }
    finally { setIsLoading(false) }
  }

  const handleSave = async () => {
    if (!accountSid || !authToken || !phoneNumber) { addToast('All fields are required', 'destructive'); return }
    setIsSaving(true)
    try {
      const res = await fetch('/api/twilio-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountSid, authToken, phoneNumber }) })
      if (res.ok) { const data = await res.json(); setConfig(data); setAuthToken(''); addToast('Twilio credentials saved', 'success') }
      else { const err = await res.json(); addToast(err.error || 'Failed to save', 'destructive') }
    } catch { addToast('An error occurred while saving', 'destructive') }
    finally { setIsSaving(false) }
  }

  const handleTestSMS = async () => {
    const cleanPhone = testPhone.replace(/\D/g, '')
    if (cleanPhone.length < 10) { addToast('Enter a valid phone number', 'destructive'); return }
    setIsTesting(true)
    try {
      const res = await fetch('/api/twilio-config/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: `+1${cleanPhone.slice(-10)}` }) })
      addToast(res.ok ? 'Test SMS sent successfully!' : ((await res.json()).error || 'Failed to send test SMS'), res.ok ? 'success' : 'destructive')
    } catch { addToast('Failed to send test SMS', 'destructive') }
    finally { setIsTesting(false) }
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-zinc-400" /></div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
        <h1 className="text-2xl font-bold">SMS Configuration</h1>
      </div>

      <TwilioConnectionStatus phoneNumber={config?.phoneNumber} isActive={!!config} />
      <TwilioCredentialsForm accountSid={accountSid} authToken={authToken} phoneNumber={phoneNumber} hasExistingConfig={!!config} isSaving={isSaving} onAccountSidChange={setAccountSid} onAuthTokenChange={setAuthToken} onPhoneNumberChange={setPhoneNumber} onSave={handleSave} />

      {config && (
        <Card>
          <CardHeader><CardTitle>Send Test SMS</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-500">Send a test message to verify your Twilio configuration is working.</p>
            <div className="flex gap-3">
              <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="(555) 123-4567" className="flex-1" />
              <Button onClick={handleTestSMS} disabled={isTesting} variant="outline" className="gap-2">
                {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}Send Test
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
