'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CellEditor } from './cell-editor'
import type { CleanedRow, CleanedCell, SystemField } from '@/lib/import/types'
import { SYSTEM_FIELD_LABELS } from '@/lib/import/field-mapping'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DataPreviewTableProps {
  rows: CleanedRow[]
  onCellUpdate?: (rowIndex: number, field: SystemField, cell: CleanedCell) => void
  editable?: boolean
  visibleFields?: SystemField[]
  pageSize?: number
}

const DEFAULT_VISIBLE: SystemField[] = [
  'firstName', 'lastName', 'phone', 'email',
  'vehicleYear', 'vehicleMake', 'vehicleModel',
  'lastServiceDate', 'lastServiceMileage',
]

export function DataPreviewTable({
  rows,
  onCellUpdate,
  editable = false,
  visibleFields,
  pageSize = 20,
}: DataPreviewTableProps) {
  const [page, setPage] = useState(0)

  const fields = visibleFields ?? DEFAULT_VISIBLE
  const displayFields = fields.filter(f => {
    if (f === 'skip') return false
    return rows.some(r => r.cells[f]?.value)
  })

  // Always show firstName, lastName, phone even if empty
  const requiredVisible: SystemField[] = ['firstName', 'lastName', 'phone']
  for (const rf of requiredVisible) {
    if (fields.includes(rf) && !displayFields.includes(rf)) {
      displayFields.unshift(rf)
    }
  }

  const totalPages = Math.ceil(rows.length / pageSize)
  const start = page * pageSize
  const pageRows = rows.slice(start, start + pageSize)

  return (
    <div className="space-y-2">
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900 border-b">
                <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground w-10">#</th>
                {displayFields.map(f => (
                  <th key={f} className="px-2 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                    {SYSTEM_FIELD_LABELS[f]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map(row => (
                <tr
                  key={row.rowIndex}
                  className={`border-b ${
                    row.hasError ? 'bg-red-50/50 dark:bg-red-950/20' :
                    row.hasWarning ? 'bg-yellow-50/50 dark:bg-yellow-950/20' : ''
                  }`}
                >
                  <td className="px-2 py-1 text-xs text-muted-foreground">{row.rowIndex + 1}</td>
                  {displayFields.map(field => {
                    const cell = row.cells[field]
                    if (!cell) return <td key={field} className="px-2 py-1" />

                    return (
                      <td key={field} className="px-1 py-0.5 max-w-[160px]">
                        {editable && onCellUpdate ? (
                          <CellEditor
                            cell={cell}
                            field={field}
                            onSave={newCell => onCellUpdate(row.rowIndex, field, newCell)}
                          />
                        ) : (
                          <span
                            className={`text-xs truncate block px-1.5 py-0.5 ${
                              cell.status === 'error' ? 'text-red-600' :
                              cell.status === 'warning' ? 'text-yellow-600' :
                              cell.status === 'fixed' ? 'text-blue-600' : ''
                            }`}
                            title={cell.message || undefined}
                          >
                            {cell.value || <span className="text-zinc-400">-</span>}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {start + 1}-{Math.min(start + pageSize, rows.length)} of {rows.length}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
