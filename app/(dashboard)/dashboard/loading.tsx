import { StatCardGridSkeleton } from '@/components/skeletons'

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      <StatCardGridSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
        <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}
