'use client'

import { CheckCircle2, AlertCircle } from 'lucide-react'

interface ImportResultData {
  success: number
  errors: number
  duplicates: number
  message: string
  format?: string
  details?: string[]
}

export function ImportResult({ result }: { result: ImportResultData }) {
  return (
    <div className={`p-4 rounded-lg ${result.errors > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
      <div className="flex items-center gap-2 mb-2">
        {result.errors > 0 ? (
          <AlertCircle className="w-5 h-5 text-red-500" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        )}
        <span className="font-medium">{result.message}</span>
      </div>
      {result.format && (
        <p className="text-sm text-zinc-600 mb-3">
          Detected format: <span className="font-medium">{result.format}</span>
        </p>
      )}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-2xl font-bold text-green-600">{result.success}</span>
          <p className="text-zinc-600">Imported</p>
        </div>
        <div>
          <span className="text-2xl font-bold text-yellow-600">{result.duplicates}</span>
          <p className="text-zinc-600">Duplicates</p>
        </div>
        <div>
          <span className="text-2xl font-bold text-red-600">{result.errors}</span>
          <p className="text-zinc-600">Errors</p>
        </div>
      </div>
      {result.details && result.details.length > 0 && (
        <div className="mt-3 pt-3 border-t border-red-200">
          <p className="text-sm font-medium text-red-700 mb-1">Error details:</p>
          <ul className="space-y-1 text-sm text-red-600">
            {result.details.map((detail, i) => (
              <li key={i}>{detail}</li>
            ))}
          </ul>
          {result.errors > result.details.length && (
            <p className="text-xs text-red-400 mt-1">
              Showing {result.details.length} of {result.errors} errors
            </p>
          )}
        </div>
      )}
    </div>
  )
}
