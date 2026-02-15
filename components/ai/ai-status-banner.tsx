import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Plug, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AiStatusBannerProps {
  hasConfig: boolean
  provider?: string
  model?: string
  isPersonalized: boolean
  tone?: string
}

export function AiStatusBanner({
  hasConfig,
  provider,
  model,
  isPersonalized,
  tone,
}: AiStatusBannerProps) {
  if (!hasConfig) {
    return (
      <Card className="border-amber-300 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-950/20">
        <CardContent className="flex items-center gap-3 py-4">
          <AlertTriangle className="size-5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-medium">AI not set up yet</p>
            <p className="text-xs text-muted-foreground">
              Configure your AI provider below to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isPersonalized) {
    return (
      <Card className="border-blue-300 bg-blue-50/50 dark:border-blue-500/30 dark:bg-blue-950/20">
        <CardContent className="flex items-center gap-3 py-4">
          <Plug className="size-5 shrink-0 text-blue-500" />
          <div>
            <p className="text-sm font-medium">Provider connected</p>
            <p className="text-xs text-muted-foreground">
              Enable AI personalization below to start generating smarter messages.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-violet-300 dark:border-violet-500/30',
        'bg-gradient-to-r from-violet-50 via-fuchsia-50/50 to-violet-50',
        'dark:from-violet-950/30 dark:via-fuchsia-950/20 dark:to-violet-950/30',
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent" />
      <CardContent className="flex flex-wrap items-center gap-3 py-4">
        <Sparkles className="size-5 shrink-0 text-violet-500" />
        <p className="text-sm font-medium">AI Shop Manager is active</p>
        <div className="flex flex-wrap items-center gap-2">
          {provider && (
            <Badge variant="secondary" className="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 capitalize">
              {provider}
            </Badge>
          )}
          {model && (
            <Badge variant="secondary" className="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
              {model}
            </Badge>
          )}
          {tone && (
            <Badge variant="secondary" className="bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/50 dark:text-fuchsia-300 capitalize">
              {tone} tone
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
