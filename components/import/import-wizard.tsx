'use client'

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { useImportWizard } from '@/hooks/use-import-wizard'
import { StepUpload } from './step-upload'
import { StepFieldMapping } from './step-field-mapping'
import { StepDataCleaning } from './step-data-cleaning'
import { StepReview } from './step-review'
import type { ImportStep } from '@/lib/import/types'

const STEPS: { key: ImportStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'mapping', label: 'Map Fields' },
  { key: 'cleaning', label: 'Clean Data' },
  { key: 'review', label: 'Review' },
]

export function ImportWizard() {
  const {
    state, dispatch, canGoNext, goNext, goBack,
    currentStepIndex, isFirstStep, isLastStep,
  } = useImportWizard()

  const handleImport = useCallback(async () => {
    dispatch({ type: 'SET_IMPORTING', payload: true })

    const importRows = state.cleanedRows
      .filter(r => !r.hasError)
      .map(r => {
        const cells: Record<string, string> = {}
        for (const [k, v] of Object.entries(r.cells)) {
          cells[k] = v.value
        }
        return cells
      })

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: importRows, smsConsent: state.smsConsent }),
      })
      const result = await res.json()
      dispatch({ type: 'SET_IMPORT_RESULT', payload: result })
    } catch {
      dispatch({
        type: 'SET_IMPORT_RESULT',
        payload: { success: 0, errors: 1, duplicates: 0, message: 'Import failed. Please try again.' },
      })
    }
  }, [state.cleanedRows, state.smsConsent, dispatch])

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <nav className="flex items-center gap-1" aria-label="Import progress">
        {STEPS.map((step, i) => {
          const isActive = i === currentStepIndex
          const isCompleted = i < currentStepIndex
          return (
            <div key={step.key} className="flex items-center gap-1 flex-1">
              <div className="flex items-center gap-2 flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isCompleted
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'
                  }`}
                >
                  {isCompleted ? '\u2713' : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:inline ${
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 min-w-[16px] ${
                  isCompleted ? 'bg-green-300 dark:bg-green-700' : 'bg-zinc-200 dark:bg-zinc-700'
                }`} />
              )}
            </div>
          )
        })}
      </nav>

      {/* Step content */}
      {state.step === 'upload' && (
        <StepUpload
          parsedFile={state.parsedFile}
          onFileParsed={f => dispatch({ type: 'SET_PARSED_FILE', payload: f })}
        />
      )}

      {state.step === 'mapping' && state.parsedFile && (
        <StepFieldMapping
          parsedFile={state.parsedFile}
          mappings={state.mappings}
          onSetMappings={m => dispatch({ type: 'SET_MAPPINGS', payload: m })}
          onUpdateMapping={(src, tgt) => dispatch({ type: 'UPDATE_MAPPING', payload: { sourceHeader: src, targetField: tgt } })}
        />
      )}

      {state.step === 'cleaning' && state.parsedFile && (
        <StepDataCleaning
          parsedFile={state.parsedFile}
          mappings={state.mappings}
          cleanedRows={state.cleanedRows}
          validationSummary={state.validationSummary}
          onCleaningComplete={(rows, summary) => dispatch({ type: 'SET_CLEANED_ROWS', payload: { rows, summary } })}
          onCellUpdate={(rowIdx, field, cell) => dispatch({ type: 'UPDATE_CELL', payload: { rowIndex: rowIdx, field, cell } })}
        />
      )}

      {state.step === 'review' && state.validationSummary && (
        <StepReview
          cleanedRows={state.cleanedRows}
          validationSummary={state.validationSummary}
          smsConsent={state.smsConsent}
          onSmsConsentChange={v => dispatch({ type: 'SET_SMS_CONSENT', payload: v })}
          existingDuplicates={state.existingDuplicates}
          internalDuplicates={state.internalDuplicates}
          onDuplicatesFound={(existing, internal) => dispatch({ type: 'SET_DUPLICATES', payload: { existing, internal } })}
          importResult={state.importResult}
          isImporting={state.isImporting}
          onImport={handleImport}
        />
      )}

      {/* Navigation footer */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div>
          {!isFirstStep && !state.importResult && (
            <Button variant="outline" onClick={goBack} className="gap-1.5">
              <ChevronLeft className="w-4 h-4" />Back
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {state.importResult ? (
            <Button variant="outline" onClick={() => dispatch({ type: 'RESET' })} className="gap-1.5">
              <RotateCcw className="w-4 h-4" />Import Another File
            </Button>
          ) : (
            !isLastStep && (
              <Button onClick={goNext} disabled={!canGoNext()} className="gap-1.5">
                Next<ChevronRight className="w-4 h-4" />
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
