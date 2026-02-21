'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { Brain, Loader2, Save, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AiConfigFormProps {
  onSaved?: () => void
}

type Provider = 'anthropic' | 'openai' | 'google'

const PROVIDERS: { value: Provider; label: string }[] = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Google (Gemini)' },
]

const MODELS: Record<Provider, { value: string; label: string }[]> = {
  anthropic: [
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    { value: 'claude-sonnet-4-5-20250514', label: 'Claude Sonnet 4.5' },
    { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
  ],
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  ],
  google: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  ],
}

const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
  google: 'gemini-2.0-flash',
}

const PROVIDER_INFO: Record<Provider, string> = {
  anthropic: 'Recommended for SMS - fast, concise responses',
  openai: 'Good general-purpose model',
  google: 'Cost-effective option',
}

interface AiConfigResponse {
  id: string
  provider: Provider
  model: string
  apiKey: string
  isActive: boolean
}

export function AiConfigForm({ onSaved }: AiConfigFormProps) {
  const { addToast } = useToast()
  const [provider, setProvider] = useState<Provider>('anthropic')
  const [model, setModel] = useState(DEFAULT_MODELS.anthropic)
  const [apiKey, setApiKey] = useState('')
  const [hasExisting, setHasExisting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const busy = saving || deleting

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/ai-config')
      if (!res.ok) {
        if (res.status !== 404) throw new Error('Failed to load')
        return
      }
      const data: AiConfigResponse | null = await res.json()
      if (!data) return
      setProvider(data.provider)
      setModel(data.model)
      setHasExisting(true)
    } catch {
      addToast('Failed to load AI configuration', 'destructive')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { loadConfig() }, [loadConfig])

  function handleProviderChange(value: Provider) {
    setProvider(value)
    setModel(DEFAULT_MODELS[value])
  }

  async function handleSave() {
    if (!hasExisting && !apiKey) {
      addToast('API key is required', 'destructive')
      return
    }
    setSaving(true)
    try {
      const body: Record<string, string> = { provider, model }
      if (apiKey) body.apiKey = apiKey
      const res = await fetch('/api/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Save failed')
      setHasExisting(true)
      setApiKey('')
      addToast('AI configuration saved', 'success')
      onSaved?.()
    } catch {
      addToast('Failed to save configuration', 'destructive')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setDeleting(true)
    try {
      const res = await fetch('/api/ai-config', { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setProvider('anthropic')
      setModel(DEFAULT_MODELS.anthropic)
      setApiKey('')
      setHasExisting(false)
      addToast('AI configuration removed', 'success')
      onSaved?.()
    } catch {
      addToast('Failed to remove configuration', 'destructive')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-violet-200 dark:border-violet-500/30">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-violet-500" />
        </CardContent>
      </Card>
    )
  }

  const cardClass = cn(
    'relative overflow-hidden border-violet-200 dark:border-violet-500/30',
    'bg-gradient-to-br from-violet-50/50 via-card to-card',
    'dark:from-violet-950/20 dark:via-card dark:to-card'
  )

  return (
    <Card className={cardClass}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="size-5 text-violet-500" />
          AI Configuration
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure your AI provider and model for generating personalized SMS messages.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="ai-provider">Provider</Label>
          <Select value={provider} onValueChange={handleProviderChange}>
            <SelectTrigger id="ai-provider" className="min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge
            variant="secondary"
            className="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
          >
            {PROVIDER_INFO[provider]}
          </Badge>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-model">Model</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger id="ai-model" className="min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELS[provider].map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-api-key">API Key</Label>
          <Input
            id="ai-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasExisting ? '••••••••' : 'Enter API key'}
            className="min-h-[44px]"
          />
          {hasExisting && !apiKey && (
            <p className="text-xs text-muted-foreground">Leave blank to keep the existing key.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            onClick={handleSave}
            disabled={busy}
            className="min-h-[44px] gap-2 bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-700"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Configuration
          </Button>
          {hasExisting && (
            <Button
              variant="outline"
              onClick={handleRemove}
              disabled={busy}
              className="min-h-[44px] gap-2 border-destructive text-destructive hover:bg-destructive/10"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Remove Configuration
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
