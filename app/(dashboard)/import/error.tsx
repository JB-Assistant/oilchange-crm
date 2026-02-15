'use client'

import { ErrorBoundary } from '@/components/error-boundary'

export default function ImportError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorBoundary error={error} reset={reset} title="Failed to load import page" />
}
