'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Zap, MessageSquare, Loader2, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIPersonalizationCardProps {
  enabled: boolean
  tone: string
  onToggle: (enabled: boolean) => void
  onToneChange: (tone: string) => void
}

interface PreviewResponse {
  staticMessage: string
  aiMessage: string
  aiAvailable: boolean
}

const TONES = [
  { value: 'friendly', label: 'Friendly', icon: Zap, example: 'Hi Sarah! Your Camry is due for...' },
  { value: 'professional', label: 'Professional', icon: User, example: 'Dear Sarah, your scheduled service...' },
  { value: 'casual', label: 'Casual', icon: MessageSquare, example: 'Hey Sarah, quick heads up about...' },
] as const

export function AIPersonalizationCard({
  enabled,
  tone,
  onToggle,
  onToneChange,
}: AIPersonalizationCardProps) {
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [loading, setLoading] = useState(false)

  async function fetchPreview() {
    setLoading(true)
    setPreview(null)
    try {
      const res = await fetch('/api/ai-sms/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone }),
      })
      if (!res.ok) throw new Error('Preview fetch failed')
      const data: PreviewResponse = await res.json()
      setPreview(data)
    } catch {
      setPreview({ staticMessage: 'Unable to load preview.', aiMessage: 'Unable to load preview.', aiAvailable: false })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="relative overflow-hidden border-violet-200 dark:border-violet-500/30 bg-gradient-to-br from-violet-50/50 via-card to-card dark:from-violet-950/20 dark:via-card dark:to-card">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent" />

      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-violet-500" />
            AI-Powered Messages
            <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
              Beta
            </Badge>
          </CardTitle>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
        <p className="text-sm text-muted-foreground">
          AI personalizes each SMS using customer history, vehicle info, and service urgency
          to improve engagement.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Tone selector */}
        <div className={cn('space-y-3 transition-opacity', !enabled && 'pointer-events-none opacity-50')}>
          <p className="text-sm font-medium">Message Tone</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {TONES.map(({ value, label, icon: Icon, example }) => {
              const selected = tone === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onToneChange(value)}
                  className={cn(
                    'flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-all min-h-[44px]',
                    'hover:border-violet-300 dark:hover:border-violet-600',
                    selected
                      ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-400/30 dark:border-violet-500 dark:bg-violet-950/30 dark:ring-violet-500/20'
                      : 'border-border bg-background'
                  )}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Icon className="size-4 text-violet-500" />
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground italic">{example}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Preview section */}
        <div className={cn('space-y-3 transition-opacity', !enabled && 'pointer-events-none opacity-50')}>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPreview}
            disabled={loading}
            className="border-violet-200 hover:bg-violet-50 dark:border-violet-700 dark:hover:bg-violet-950/40"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Preview AI Message
          </Button>

          {(loading || preview) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <PreviewPanel
                label="Static Template"
                icon={<User className="size-3.5" />}
                text={preview?.staticMessage}
                loading={loading}
              />
              <PreviewPanel
                label="AI Generated"
                icon={<Bot className="size-3.5" />}
                text={preview?.aiMessage}
                loading={loading}
                highlight
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function PreviewPanel({
  label,
  icon,
  text,
  loading,
  highlight,
}: {
  label: string
  icon: React.ReactNode
  text: string | undefined
  loading: boolean
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3 text-sm',
        highlight
          ? 'border-violet-300 bg-violet-50/50 dark:border-violet-600 dark:bg-violet-950/20'
          : 'border-border bg-zinc-50 dark:bg-zinc-900/50'
      )}
    >
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          <span className="text-xs">Generating...</span>
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-foreground">{text}</p>
      )}
    </div>
  )
}
