import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/status-badge'
import { CustomerStatus } from '@prisma/client'
import Link from 'next/link'

interface StatusCardProps {
  title: string
  count: number
  status: CustomerStatus
  href: string
}

export function StatusCard({ title, count, status, href }: StatusCardProps) {
  return (
    <Link href={href}>
      <Card className="hover:border-zinc-300 transition-colors cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-600">{title}</p>
              <p className="text-3xl font-bold mt-2">{count}</p>
            </div>
            <StatusBadge status={status} />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
