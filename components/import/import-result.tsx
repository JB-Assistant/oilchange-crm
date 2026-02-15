'use client'

import { CheckCircle2, AlertCircle, AlertTriangle, Car, Wrench, RefreshCw } from 'lucide-react'
import type { ImportResultData } from '@/lib/import/types'

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
      <div className={`grid gap-4 text-sm ${result.updated ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <div>
          <span className="text-2xl font-bold text-green-600">{result.success}</span>
          <p className="text-zinc-600">Imported</p>
        </div>
        {!!result.updated && (
          <div>
            <div className="flex items-center gap-1">
              <RefreshCw className="w-4 h-4 text-blue-500" />
              <span className="text-2xl font-bold text-blue-600">{result.updated}</span>
            </div>
            <p className="text-zinc-600">Enriched</p>
          </div>
        )}
        <div>
          <span className="text-2xl font-bold text-yellow-600">{result.duplicates}</span>
          <p className="text-zinc-600">Duplicates</p>
        </div>
        <div>
          <span className="text-2xl font-bold text-red-600">{result.errors}</span>
          <p className="text-zinc-600">Errors</p>
        </div>
      </div>
      {(result.vehiclesCreated !== undefined || result.serviceRecordsCreated !== undefined) && (
        <div className="grid grid-cols-2 gap-4 text-sm mt-3 pt-3 border-t border-zinc-200">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-zinc-500" />
            <span className="text-2xl font-bold text-zinc-700">{result.vehiclesCreated ?? 0}</span>
            <p className="text-zinc-600">Vehicles</p>
          </div>
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-zinc-500" />
            <span className="text-2xl font-bold text-zinc-700">{result.serviceRecordsCreated ?? 0}</span>
            <p className="text-zinc-600">Service Records</p>
          </div>
        </div>
      )}
      {result.warnings && result.warnings.length > 0 && (
        <div className="mt-3 pt-3 border-t border-yellow-200">
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <p className="text-sm font-medium text-yellow-700">Warnings:</p>
          </div>
          <ul className="space-y-1 text-sm text-yellow-600">
            {result.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
          {(result.warnings.length >= 10) && (
            <p className="text-xs text-yellow-500 mt-1">
              Showing first 10 warnings
            </p>
          )}
        </div>
      )}
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
