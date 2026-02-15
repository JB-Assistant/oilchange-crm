export default function CustomerDetailLoading() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      <div className="h-6 w-48 bg-muted rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="h-48 bg-muted/50 rounded-xl" />
          <div className="h-32 bg-muted/50 rounded-xl" />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="h-64 bg-muted/50 rounded-xl" />
          <div className="h-48 bg-muted/50 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
