'use client'

import { AlertCircle } from 'lucide-react'

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
}

export function ErrorBoundary({ error, reset, title = 'Something went wrong' }: ErrorBoundaryProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <AlertCircle className="h-12 w-12 text-danger" />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-otto-500 text-white text-sm font-medium hover:bg-otto-600 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
