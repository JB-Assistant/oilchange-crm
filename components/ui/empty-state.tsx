import { type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="w-12 h-12 text-muted-foreground/40 mb-4" />
      <h3 className="font-medium text-lg mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>
      {actionLabel && (actionHref ? (
        <Button asChild><a href={actionHref}>{actionLabel}</a></Button>
      ) : onAction ? (
        <Button onClick={onAction}>{actionLabel}</Button>
      ) : null)}
    </div>
  )
}
