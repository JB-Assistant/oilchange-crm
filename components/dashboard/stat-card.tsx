import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: string
  alert?: boolean
}

export function StatCard({ title, value, icon, trend, alert }: StatCardProps) {
  return (
    <Card className={alert && Number(value) > 0 ? 'border-red-200' : ''}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-600">{title}</p>
            <p className={`text-3xl font-bold mt-2 ${alert && Number(value) > 0 ? 'text-red-600' : ''}`}>
              {value}
            </p>
            {trend && <p className="text-xs text-zinc-500 mt-1">{trend}</p>}
          </div>
          <div className="p-3 bg-zinc-100 rounded-full">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
