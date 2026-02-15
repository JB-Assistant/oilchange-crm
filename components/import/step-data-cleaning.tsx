'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CleaningSummary } from './cleaning-summary'
import { DataPreviewTable } from './data-preview-table'
import { applyCleaningPipeline } from '@/lib/import/data-validators'
import type {
  ParsedFile, FieldMapping, CleanedRow, ValidationSummary,
  SystemField, CleanedCell,
} from '@/lib/import/types'

type FilterTab = 'all' | 'warnings' | 'errors'

interface StepDataCleaningProps {
  parsedFile: ParsedFile
  mappings: FieldMapping[]
  cleanedRows: CleanedRow[]
  validationSummary: ValidationSummary | null
  onCleaningComplete: (rows: CleanedRow[], summary: ValidationSummary) => void
  onCellUpdate: (rowIndex: number, field: SystemField, cell: CleanedCell) => void
}

export function StepDataCleaning({
  parsedFile,
  mappings,
  cleanedRows,
  validationSummary,
  onCleaningComplete,
  onCellUpdate,
}: StepDataCleaningProps) {
  const [filter, setFilter] = useState<FilterTab>('all')

  useEffect(() => {
    if (cleanedRows.length === 0) {
      const { rows, summary } = applyCleaningPipeline(
        parsedFile.rows,
        parsedFile.headers,
        mappings
      )
      onCleaningComplete(rows, summary)
    }
  }, [parsedFile, mappings, cleanedRows.length, onCleaningComplete])

  const filteredRows = useMemo(() => {
    switch (filter) {
      case 'warnings': return cleanedRows.filter(r => r.hasWarning)
      case 'errors': return cleanedRows.filter(r => r.hasError)
      default: return cleanedRows
    }
  }, [cleanedRows, filter])

  const activeFields = useMemo(() => {
    return mappings
      .filter(m => m.targetField !== 'skip')
      .map(m => m.targetField)
      .flatMap(f => {
        if (f === 'fullName') return ['firstName', 'lastName'] as SystemField[]
        if (f === 'yearMakeModel') return ['vehicleYear', 'vehicleMake', 'vehicleModel'] as SystemField[]
        return [f]
      })
      .filter((v, i, a) => a.indexOf(v) === i) as SystemField[]
  }, [mappings])

  if (!validationSummary || cleanedRows.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Running data cleaning pipeline...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <CleaningSummary summary={validationSummary} />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base">Cleaned Data</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click any cell to edit. Changes are re-validated automatically.
              </p>
            </div>
            <div className="flex gap-1">
              {(['all', 'warnings', 'errors'] as FilterTab[]).map(tab => (
                <Button
                  key={tab}
                  variant={filter === tab ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(tab)}
                  className="text-xs capitalize"
                >
                  {tab}
                  {tab === 'warnings' && validationSummary.warningRows > 0 && (
                    <span className="ml-1 text-[10px]">({validationSummary.warningRows})</span>
                  )}
                  {tab === 'errors' && validationSummary.errorRows > 0 && (
                    <span className="ml-1 text-[10px]">({validationSummary.errorRows})</span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRows.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">
              No rows match this filter
            </p>
          ) : (
            <DataPreviewTable
              rows={filteredRows}
              editable
              onCellUpdate={onCellUpdate}
              visibleFields={activeFields}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
