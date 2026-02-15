'use client'

import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { FieldMapping, SystemField } from '@/lib/import/types'
import { ALL_SYSTEM_FIELDS, SYSTEM_FIELD_LABELS } from '@/lib/import/field-mapping'

interface MappingRowProps {
  mapping: FieldMapping
  usedFields: Set<SystemField>
  onUpdate: (sourceHeader: string, targetField: SystemField) => void
}

export function MappingRow({ mapping, usedFields, onUpdate }: MappingRowProps) {
  const confidenceColor = mapping.confidence >= 80
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    : mapping.confidence >= 40
      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 border rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{mapping.sourceHeader}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {mapping.sampleValue || <span className="italic">no data</span>}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {mapping.targetField !== 'skip' && (
          <Badge className={`text-[10px] ${confidenceColor} border-0`}>
            {mapping.confidence}%
          </Badge>
        )}

        <Select
          value={mapping.targetField}
          onValueChange={v => onUpdate(mapping.sourceHeader, v as SystemField)}
        >
          <SelectTrigger className="w-[180px]" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_SYSTEM_FIELDS.map(field => {
              const isUsed = field !== 'skip' && field !== mapping.targetField && usedFields.has(field)
              return (
                <SelectItem key={field} value={field} disabled={isUsed}>
                  {SYSTEM_FIELD_LABELS[field]}
                  {isUsed && ' (used)'}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
