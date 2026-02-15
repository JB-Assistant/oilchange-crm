'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, MessageSquare } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface BulkSmsDialogProps {
  customerIds: string[]
  customerCount: number
  trigger?: React.ReactNode
}

interface BulkSmsResponse {
  sent: number
  failed: number
  skipped: number
}

const MAX_CHARS = 160

export function BulkSmsDialog({ customerIds, customerCount, trigger }: BulkSmsDialogProps) {
  const { addToast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [useTemplate, setUseTemplate] = useState(false)
  const [templateBody, setTemplateBody] = useState('')

  const activeText = useTemplate ? templateBody : message
  const isOverLimit = activeText.length > MAX_CHARS
  const canSend = activeText.trim().length > 0 && !loading
  const plural = customerCount !== 1 ? 's' : ''

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) { setMessage(''); setTemplateBody(''); setUseTemplate(false) }
  }

  async function handleSend() {
    if (!canSend) return
    setLoading(true)
    try {
      const response = await fetch('/api/sms/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerIds,
          message: useTemplate ? undefined : message,
          useTemplate,
          templateBody: useTemplate ? templateBody : undefined,
        }),
      })
      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error ?? 'Failed to send bulk SMS')
      }
      const result = (await response.json()) as BulkSmsResponse
      addToast(`Sent: ${result.sent}, Failed: ${result.failed}, Skipped: ${result.skipped}`, 'success')
      setOpen(false)
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to send bulk SMS', 'destructive')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Send Bulk SMS
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Bulk SMS
          </DialogTitle>
          <DialogDescription>
            Compose a message to send to{' '}
            <Badge variant="secondary">{customerCount}</Badge> selected customer{plural}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="use-template">Use Template</Label>
            <Switch id="use-template" checked={useTemplate} onCheckedChange={setUseTemplate} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={useTemplate ? 'template-body' : 'plain-message'}>
              {useTemplate ? 'Template Body' : 'Message'}
            </Label>
            <Textarea
              id={useTemplate ? 'template-body' : 'plain-message'}
              value={useTemplate ? templateBody : message}
              onChange={(e) => (useTemplate ? setTemplateBody : setMessage)(e.target.value)}
              placeholder={useTemplate
                ? 'Hi {{firstName}}, your vehicle is due for service at {{shopName}}. Call us to book!'
                : 'Type your message here...'}
              rows={4}
            />
          </div>
          <p className={`text-xs ${isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
            {activeText.length} / {MAX_CHARS} characters
            {isOverLimit && ' — message may be split into multiple SMS'}
          </p>
          <p className="text-xs text-muted-foreground">
            Only customers with SMS consent will receive messages.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!canSend} className="gap-2">
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
              : <><Send className="h-4 w-4" /> Send to {customerCount} customer{plural}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
