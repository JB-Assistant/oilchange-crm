import { CustomerStatus } from '@prisma/client'
import { getStatusColor } from '@/lib/customer-status'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: CustomerStatus
  size?: 'sm' | 'md'
  className?: string
}

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const colors = getStatusColor(status)
  const isOverdue = status === 'overdue'

  return (
    <Badge
      variant="outline"
      className={cn(
        colors.bg, colors.text, colors.border,
        size === 'sm' && 'text-xs px-2 py-0',
        className,
      )}
    >
      <span className={cn(
        'w-2 h-2 rounded-full mr-1.5',
        colors.dot,
        isOverdue && 'animate-pulse',
      )} />
      {colors.label}
    </Badge>
  )
}
