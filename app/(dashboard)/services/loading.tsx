import { ServiceListSkeleton } from '@/components/skeletons'

export default function ServicesLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-muted rounded animate-pulse" />
        <div className="h-10 w-40 bg-muted rounded-lg animate-pulse" />
      </div>
      <ServiceListSkeleton />
    </div>
  )
}
