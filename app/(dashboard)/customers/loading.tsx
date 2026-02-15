import { CustomerListSkeleton } from '@/components/skeletons'

export default function CustomersLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="h-10 w-36 bg-muted rounded-lg animate-pulse" />
      </div>
      <div className="flex gap-2">
        <div className="h-10 w-64 bg-muted rounded-lg animate-pulse" />
        <div className="h-10 w-24 bg-muted rounded-lg animate-pulse" />
      </div>
      <CustomerListSkeleton />
    </div>
  )
}
