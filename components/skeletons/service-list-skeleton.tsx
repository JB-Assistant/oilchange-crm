'use client'

function ServiceRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border/50 animate-pulse">
      <div className="h-8 w-8 bg-muted rounded" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-40 bg-muted rounded" />
        <div className="h-3 w-28 bg-muted rounded" />
      </div>
      <div className="h-4 w-20 bg-muted rounded" />
    </div>
  )
}

export function ServiceListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <ServiceRowSkeleton key={i} />
      ))}
    </div>
  )
}
