'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { AiStatusBanner } from '@/components/ai/ai-status-banner'
import { AiConfigForm } from '@/components/settings/ai-config-form'
import { AIPersonalizationCard } from '@/components/settings/ai-personalization-card'

interface AiConfigData {
  provider: string
  model: string
  isActive: boolean
}

interface AiSettingsData {
  aiPersonalization: boolean
  aiTone: string
}

export default function AiManagerPage() {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<AiConfigData | null>(null)
  const [personalization, setPersonalization] = useState(false)
  const [tone, setTone] = useState('friendly')

  const loadData = useCallback(async () => {
    try {
      const [configRes, settingsRes] = await Promise.all([
        fetch('/api/ai-config'),
        fetch('/api/settings/ai'),
      ])

      if (configRes.ok) {
        const data = await configRes.json()
        setConfig(data)
      }

      if (settingsRes.ok) {
        const data: AiSettingsData = await settingsRes.json()
        setPersonalization(data.aiPersonalization)
        setTone(data.aiTone)
      }
    } catch {
      addToast('Failed to load AI settings', 'destructive')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { loadData() }, [loadData])

  const savePersonalization = async (enabled: boolean, newTone: string) => {
    try {
      const res = await fetch('/api/settings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiPersonalization: enabled, aiTone: newTone }),
      })
      if (!res.ok) throw new Error('Save failed')
    } catch {
      addToast('Failed to save personalization', 'destructive')
    }
  }

  const handleToggle = async (enabled: boolean) => {
    setPersonalization(enabled)
    await savePersonalization(enabled, tone)
  }

  const handleToneChange = async (newTone: string) => {
    setTone(newTone)
    await savePersonalization(personalization, newTone)
  }

  const handleConfigSaved = () => {
    loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    )
  }

  const hasConfig = !!config

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold flex items-center gap-2">
          <Sparkles className="size-7 text-violet-500" />
          AI Shop Manager
        </h1>
        <p className="text-muted-foreground mt-1">
          Set up your AI assistant to craft personalized SMS messages for every customer.
        </p>
      </div>

      <AiStatusBanner
        hasConfig={hasConfig}
        provider={config?.provider}
        model={config?.model}
        isPersonalized={personalization}
        tone={tone}
      />

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex size-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
            1
          </span>
          <h2 className="text-lg font-semibold">Configure AI Provider</h2>
        </div>
        <AiConfigForm onSaved={handleConfigSaved} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex size-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
            2
          </span>
          <h2 className="text-lg font-semibold">Personalize Messages</h2>
        </div>
        <AIPersonalizationCard
          enabled={personalization}
          tone={tone}
          onToggle={handleToggle}
          onToneChange={handleToneChange}
        />
      </section>
    </div>
  )
}
