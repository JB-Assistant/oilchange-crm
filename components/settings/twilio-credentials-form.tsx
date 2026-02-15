'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save } from 'lucide-react'

interface TwilioCredentialsFormProps {
  accountSid: string
  authToken: string
  phoneNumber: string
  hasExistingConfig: boolean
  isSaving: boolean
  onAccountSidChange: (value: string) => void
  onAuthTokenChange: (value: string) => void
  onPhoneNumberChange: (value: string) => void
  onSave: () => void
}

export function TwilioCredentialsForm({
  accountSid, authToken, phoneNumber, hasExistingConfig, isSaving,
  onAccountSidChange, onAuthTokenChange, onPhoneNumberChange, onSave,
}: TwilioCredentialsFormProps) {
  return (
    <Card>
      <CardHeader><CardTitle>Twilio Credentials</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="accountSid">Account SID</Label>
          <Input id="accountSid" value={accountSid} onChange={(e) => onAccountSidChange(e.target.value)} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="authToken">Auth Token</Label>
          <Input id="authToken" type="password" value={authToken} onChange={(e) => onAuthTokenChange(e.target.value)} placeholder={hasExistingConfig ? '••••••••••••••••' : 'Enter auth token'} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="phoneNumber">Twilio Phone Number</Label>
          <Input id="phoneNumber" value={phoneNumber} onChange={(e) => onPhoneNumberChange(e.target.value)} placeholder="+15551234567" className="mt-1" />
        </div>
        <Button onClick={onSave} disabled={isSaving} className="gap-2">
          {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Credentials</>}
        </Button>
      </CardContent>
    </Card>
  )
}
