'use client'

import { CheckCircle2, AlertTriangle, XCircle, Wrench } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { ValidationSummary } from '@/lib/import/types'

interface CleaningSummaryProps {
  summary: ValidationSummary
}

export function CleaningSummary({ summary }: CleaningSummaryProps) {
  const stats = [
    { label: 'Clean', value: summary.cleanRows, icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Warnings', value: summary.warningRows, icon: AlertTriangle, color: 'text-yellow-600' },
    { label: 'Errors', value: summary.errorRows, icon: XCircle, color: 'text-red-600' },
    { label: 'Auto-fixed', value: summary.fixedCells, icon: Wrench, color: 'text-blue-600' },
  ]

  const fixes = [
    summary.phonesCleaned > 0 && `${summary.phonesCleaned} phones normalized`,
    summary.namesSplit > 0 && `${summary.namesSplit} names split`,
    summary.datesNormalized > 0 && `${summary.datesNormalized} dates formatted`,
  ].filter(Boolean)

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <div>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
        {fixes.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
            Auto-fixes: {fixes.join(', ')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
