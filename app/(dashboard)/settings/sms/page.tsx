'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  Loader2,
  Save,
  Phone,
  CheckCircle2,
  XCircle,
  SendHorizontal,
} from 'lucide-react'

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

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/twilio-config')
      if (res.ok) {
        const data = await res.json()
        if (data) {
          setConfig(data)
          setAccountSid(data.accountSid)
          setPhoneNumber(data.phoneNumber)
        }
      }
    } catch {
      console.error('Failed to load Twilio config')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!accountSid || !authToken || !phoneNumber) {
      addToast('All fields are required', 'destructive')
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch('/api/twilio-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountSid, authToken, phoneNumber }),
      })
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
        setAuthToken('')
        addToast('Twilio credentials saved', 'success')
      } else {
        const err = await res.json()
        addToast(err.error || 'Failed to save', 'destructive')
      }
    } catch {
      addToast('An error occurred while saving', 'destructive')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestSMS = async () => {
    const cleanPhone = testPhone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      addToast('Enter a valid phone number', 'destructive')
      return
    }
    setIsTesting(true)
    try {
      const res = await fetch('/api/twilio-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: `+1${cleanPhone.slice(-10)}` }),
      })
      if (res.ok) {
        addToast('Test SMS sent successfully!', 'success')
      } else {
        const err = await res.json()
        addToast(err.error || 'Failed to send test SMS', 'destructive')
      }
    } catch {
      addToast('Failed to send test SMS', 'destructive')
    } finally {
      setIsTesting(false)
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">SMS Configuration</h1>
      </div>

      {/* Connection Status */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5" />
              <div>
                <h2 className="font-semibold">Connection Status</h2>
                <p className="text-sm text-zinc-500">
                  {config
                    ? `Connected — ${config.phoneNumber}`
                    : 'Not configured'}
                </p>
              </div>
            </div>
            {config ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Active</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-zinc-400">
                <XCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Inactive</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Credentials */}
      <Card>
        <CardHeader>
          <CardTitle>Twilio Credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="accountSid">Account SID</Label>
            <Input
              id="accountSid"
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value)}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="authToken">Auth Token</Label>
            <Input
              id="authToken"
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder={config ? '••••••••••••••••' : 'Enter auth token'}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phoneNumber">Twilio Phone Number</Label>
            <Input
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+15551234567"
              className="mt-1"
            />
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Credentials
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Test SMS */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle>Send Test SMS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-500">
              Send a test message to verify your Twilio configuration is working.
            </p>
            <div className="flex gap-3">
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="flex-1"
              />
              <Button
                onClick={handleTestSMS}
                disabled={isTesting}
                variant="outline"
                className="gap-2"
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <SendHorizontal className="w-4 h-4" />
                )}
                Send Test
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
