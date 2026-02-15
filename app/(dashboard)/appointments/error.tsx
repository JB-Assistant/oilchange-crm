'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function AppointmentsError({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
      <h2 className="text-lg font-semibold mb-2">Failed to load appointments</h2>
      <p className="text-muted-foreground mb-4">Something went wrong. Please try again.</p>
      <Button onClick={reset}>Retry</Button>
    </div>
  )
}
