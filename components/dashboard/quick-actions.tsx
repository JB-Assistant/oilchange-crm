import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Phone, Users, TrendingUp, Download } from 'lucide-react'
import Link from 'next/link'

interface QuickActionsProps {
  recentFollowUps: number
  needAttention: number
}

export function QuickActions({ recentFollowUps, needAttention }: QuickActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Link href="/customers">
            <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
              <Users className="w-6 h-6" />
              <span className="text-xs">View Customers</span>
            </Button>
          </Link>
          <Link href="/import">
            <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
              <TrendingUp className="w-6 h-6" />
              <span className="text-xs">Import Data</span>
            </Button>
          </Link>
          <Link href="/api/export/customers">
            <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
              <Download className="w-6 h-6" />
              <span className="text-xs">Export CSV</span>
            </Button>
          </Link>
        </div>
        <div className="p-4 bg-zinc-50 rounded-lg">
          <p className="font-medium mb-2">This Week&apos;s Activity</p>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-2xl font-bold">{recentFollowUps}</p>
              <p className="text-sm text-zinc-600">Follow-ups logged</p>
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold">{needAttention}</p>
              <p className="text-sm text-zinc-600">Need attention</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
