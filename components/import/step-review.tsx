'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Users, AlertTriangle, CheckCircle2, Copy, Loader2,
} from 'lucide-react'
import { ImportResult } from './import-result'
import { detectInternalDuplicates } from '@/lib/import/data-validators'
import type {
  CleanedRow, ValidationSummary, DuplicateInfo, ImportResultData,
} from '@/lib/import/types'

interface StepReviewProps {
  cleanedRows: CleanedRow[]
  validationSummary: ValidationSummary
  smsConsent: boolean
  onSmsConsentChange: (v: boolean) => void
  existingDuplicates: DuplicateInfo[]
  internalDuplicates: DuplicateInfo[]
  onDuplicatesFound: (existing: DuplicateInfo[], internal: DuplicateInfo[]) => void
  importResult: ImportResultData | null
  isImporting: boolean
  onImport: () => void
}

export function StepReview({
  cleanedRows,
  validationSummary,
  smsConsent,
  onSmsConsentChange,
  existingDuplicates,
  internalDuplicates,
  onDuplicatesFound,
  importResult,
  isImporting,
  onImport,
}: StepReviewProps) {
  const [checkingDupes, setCheckingDupes] = useState(false)

  const checkDuplicates = useCallback(async () => {
    const internal = detectInternalDuplicates(cleanedRows)
    setCheckingDupes(true)

    try {
      const phones = cleanedRows
        .map(r => r.cells.phone?.value)
        .filter((p): p is string => !!p && p.length >= 10)

      const res = await fetch('/api/import/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phones }),
      })

      if (res.ok) {
        const { existingPhones } = await res.json() as { existingPhones: string[] }
        const existingSet = new Set(existingPhones)
        const existing: DuplicateInfo[] = cleanedRows
          .filter(r => existingSet.has(r.cells.phone?.value ?? ''))
          .map(r => ({
            phone: r.cells.phone.value,
            rowIndex: r.rowIndex,
            name: `${r.cells.firstName?.value ?? ''} ${r.cells.lastName?.value ?? ''}`.trim(),
            type: 'existing' as const,
          }))
        onDuplicatesFound(existing, internal)
      } else {
        onDuplicatesFound([], internal)
      }
    } catch {
      onDuplicatesFound([], internal)
    } finally {
      setCheckingDupes(false)
    }
  }, [cleanedRows, onDuplicatesFound])

  useEffect(() => {
    if (existingDuplicates.length === 0 && internalDuplicates.length === 0) {
      checkDuplicates()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const importableRows = cleanedRows.filter(r => !r.hasError).length
  const totalDupes = existingDuplicates.length + internalDuplicates.length

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{importableRows}</p>
            <p className="text-xs text-muted-foreground">Ready to import</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold text-red-600">{validationSummary.errorRows}</p>
            <p className="text-xs text-muted-foreground">Errors (skipped)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Copy className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
            <p className="text-2xl font-bold text-yellow-600">
              {checkingDupes ? '...' : totalDupes}
            </p>
            <p className="text-xs text-muted-foreground">Duplicates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold text-green-600">{validationSummary.cleanRows}</p>
            <p className="text-xs text-muted-foreground">Clean rows</p>
          </CardContent>
        </Card>
      </div>

      {/* Duplicate warnings */}
      {(existingDuplicates.length > 0 || internalDuplicates.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Copy className="w-4 h-4 text-yellow-500" />
              Duplicates Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {existingDuplicates.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">
                  Already in database ({existingDuplicates.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {existingDuplicates.slice(0, 10).map(d => (
                    <Badge key={d.rowIndex} variant="outline" className="text-xs">
                      Row {d.rowIndex + 1}: {d.name || d.phone}
                    </Badge>
                  ))}
                  {existingDuplicates.length > 10 && (
                    <Badge variant="outline" className="text-xs">
                      +{existingDuplicates.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
            {internalDuplicates.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">
                  Within this file ({internalDuplicates.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {internalDuplicates.slice(0, 10).map(d => (
                    <Badge key={d.rowIndex} variant="outline" className="text-xs">
                      Row {d.rowIndex + 1}: {d.phone}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Existing customers will be enriched with new vehicle and service data. Rows with no new data will be skipped.
            </p>
          </CardContent>
        </Card>
      )}

      {/* SMS Consent */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="wizard-sms-consent" className="font-medium">SMS Consent</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Opt in imported customers for SMS reminders
              </p>
            </div>
            <Switch
              id="wizard-sms-consent"
              checked={smsConsent}
              onCheckedChange={onSmsConsentChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Import button */}
      {!importResult && (
        <Button
          onClick={onImport}
          disabled={isImporting || importableRows === 0}
          className="w-full h-11"
          size="lg"
        >
          {isImporting ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Importing...</>
          ) : (
            <>Import {importableRows} Customers</>
          )}
        </Button>
      )}

      {importResult && <ImportResult result={importResult} />}
    </div>
  )
}
