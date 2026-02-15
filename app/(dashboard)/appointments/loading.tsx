import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function AppointmentsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-48 bg-muted animate-pulse rounded" />
      <Card>
        <CardHeader><div className="h-6 w-32 bg-muted animate-pulse rounded" /></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded" />)}
        </CardContent>
      </Card>
    </div>
  )
}
