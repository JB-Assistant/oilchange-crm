'use client'

import { useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { MappingRow } from './mapping-row'
import { autoDetectMappings } from '@/lib/import/field-mapping'
import type { FieldMapping, ParsedFile, SystemField } from '@/lib/import/types'

interface StepFieldMappingProps {
  parsedFile: ParsedFile
  mappings: FieldMapping[]
  onSetMappings: (mappings: FieldMapping[]) => void
  onUpdateMapping: (sourceHeader: string, targetField: SystemField) => void
}

export function StepFieldMapping({
  parsedFile,
  mappings,
  onSetMappings,
  onUpdateMapping,
}: StepFieldMappingProps) {
  // Auto-detect mappings on first render if empty
  useEffect(() => {
    if (mappings.length === 0) {
      const detected = autoDetectMappings(parsedFile.headers, parsedFile.rows)
      onSetMappings(detected)
    }
  }, [parsedFile, mappings.length, onSetMappings])

  const usedFields = useMemo(() => {
    const set = new Set<SystemField>()
    for (const m of mappings) {
      if (m.targetField !== 'skip') set.add(m.targetField)
    }
    return set
  }, [mappings])

  const hasPhone = usedFields.has('phone')
  const hasName = usedFields.has('firstName') || usedFields.has('fullName')
  const missingRequired = !hasPhone || !hasName

  const mappedCount = mappings.filter(m => m.targetField !== 'skip').length
  const highConfidence = mappings.filter(m => m.confidence >= 80 && m.targetField !== 'skip').length

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2">
              <Badge variant="secondary">{mappedCount} mapped</Badge>
              <Badge variant="secondary">{mappings.length - mappedCount} skipped</Badge>
              {highConfidence > 0 && (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                  {highConfidence} auto-detected
                </Badge>
              )}
            </div>
            {missingRequired && (
              <div className="flex items-center gap-1.5 text-yellow-600 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  {!hasPhone && !hasName
                    ? 'Map Phone and Name fields'
                    : !hasPhone
                      ? 'Map Phone field'
                      : 'Map Name field (First Name or Full Name)'}
                </span>
              </div>
            )}
            {!missingRequired && (
              <div className="flex items-center gap-1.5 text-green-600 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Required fields mapped</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Column Mapping</CardTitle>
          <p className="text-xs text-muted-foreground">
            Map your file columns to system fields. Phone and a name field are required.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {mappings.map(mapping => (
            <MappingRow
              key={mapping.sourceHeader}
              mapping={mapping}
              usedFields={usedFields}
              onUpdate={onUpdateMapping}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
