'use client'

import { useReducer, useCallback } from 'react'
import type { WizardState, WizardAction, ImportStep } from '@/lib/import/types'

const initialState: WizardState = {
  step: 'upload',
  parsedFile: null,
  mappings: [],
  cleanedRows: [],
  validationSummary: null,
  smsConsent: false,
  importResult: null,
  isImporting: false,
  existingDuplicates: [],
  internalDuplicates: [],
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_PARSED_FILE':
      return { ...state, parsedFile: action.payload, importResult: null }
    case 'SET_MAPPINGS':
      return { ...state, mappings: action.payload }
    case 'UPDATE_MAPPING':
      return {
        ...state,
        mappings: state.mappings.map(m =>
          m.sourceHeader === action.payload.sourceHeader
            ? { ...m, targetField: action.payload.targetField, confidence: 100 }
            : m
        ),
      }
    case 'SET_CLEANED_ROWS':
      return {
        ...state,
        cleanedRows: action.payload.rows,
        validationSummary: action.payload.summary,
      }
    case 'UPDATE_CELL': {
      const updated = state.cleanedRows.map(row => {
        if (row.rowIndex !== action.payload.rowIndex) return row
        const newCells = { ...row.cells, [action.payload.field]: action.payload.cell }
        const hasError = Object.values(newCells).some(c => c.status === 'error')
        const hasWarning = Object.values(newCells).some(c => c.status === 'warning')
        return { ...row, cells: newCells, hasError, hasWarning }
      })
      const summary = state.validationSummary ? {
        ...state.validationSummary,
        errorRows: updated.filter(r => r.hasError).length,
        warningRows: updated.filter(r => r.hasWarning && !r.hasError).length,
        cleanRows: updated.filter(r => !r.hasError && !r.hasWarning).length,
      } : null
      return { ...state, cleanedRows: updated, validationSummary: summary }
    }
    case 'SET_SMS_CONSENT':
      return { ...state, smsConsent: action.payload }
    case 'SET_STEP':
      return { ...state, step: action.payload }
    case 'SET_IMPORTING':
      return { ...state, isImporting: action.payload }
    case 'SET_IMPORT_RESULT':
      return { ...state, importResult: action.payload, isImporting: false }
    case 'SET_DUPLICATES':
      return {
        ...state,
        existingDuplicates: action.payload.existing,
        internalDuplicates: action.payload.internal,
      }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

const STEP_ORDER: ImportStep[] = ['upload', 'mapping', 'cleaning', 'review']

export function useImportWizard() {
  const [state, dispatch] = useReducer(wizardReducer, initialState)

  const currentStepIndex = STEP_ORDER.indexOf(state.step)

  const canGoNext = useCallback(() => {
    switch (state.step) {
      case 'upload': return !!state.parsedFile
      case 'mapping': {
        const hasPhone = state.mappings.some(m => m.targetField === 'phone')
        const hasName = state.mappings.some(
          m => m.targetField === 'firstName' || m.targetField === 'fullName'
        )
        return hasPhone && hasName
      }
      case 'cleaning': return state.cleanedRows.length > 0
      case 'review': return !state.isImporting
      default: return false
    }
  }, [state])

  const goNext = useCallback(() => {
    const nextIdx = currentStepIndex + 1
    if (nextIdx < STEP_ORDER.length) {
      dispatch({ type: 'SET_STEP', payload: STEP_ORDER[nextIdx] })
    }
  }, [currentStepIndex])

  const goBack = useCallback(() => {
    const prevIdx = currentStepIndex - 1
    if (prevIdx >= 0) {
      dispatch({ type: 'SET_STEP', payload: STEP_ORDER[prevIdx] })
    }
  }, [currentStepIndex])

  return {
    state,
    dispatch,
    canGoNext,
    goNext,
    goBack,
    currentStepIndex,
    isFirstStep: currentStepIndex === 0,
    isLastStep: currentStepIndex === STEP_ORDER.length - 1,
  }
}
