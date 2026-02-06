import { CustomerStatus } from '@prisma/client'
import { getStatusColor } from '@/lib/customer-status'
import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  status: CustomerStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colors = getStatusColor(status)
  
  return (
    <Badge 
      variant="outline" 
      className={`${colors.bg} ${colors.text} ${colors.border} ${className}`}
    >
      <span className={`w-2 h-2 rounded-full ${colors.dot} mr-1.5`} />
      {colors.label}
    </Badge>
  )
}
