'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import type { CleanedCell, SystemField } from '@/lib/import/types'
import {
  cleanPhone, cleanFirstName, cleanLastName, cleanDate,
  cleanMileage, cleanEmail, cleanYear, cleanVin, cleanGenericText,
} from '@/lib/import/data-cleaners'

interface CellEditorProps {
  cell: CleanedCell
  field: SystemField
  onSave: (cell: CleanedCell) => void
}

function reclean(field: SystemField, value: string): CleanedCell {
  const cleanerMap: Record<string, (v: string) => { cleaned: string; original: string; status: string; message: string }> = {
    phone: cleanPhone,
    firstName: cleanFirstName,
    lastName: cleanLastName,
    email: cleanEmail,
    vehicleYear: cleanYear,
    vin: cleanVin,
    lastServiceDate: cleanDate,
    lastServiceMileage: cleanMileage,
  }

  const cleaner = cleanerMap[field] ?? cleanGenericText
  const result = cleaner(value)
  return {
    value: result.cleaned,
    original: value,
    status: result.status as CleanedCell['status'],
    message: result.message,
    field,
  }
}

export function CellEditor({ cell, field, onSave }: CellEditorProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(cell.value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  function handleSave() {
    const newCell = reclean(field, value)
    onSave(newCell)
    setEditing(false)
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
        className="h-7 text-xs px-1.5 min-w-[80px]"
      />
    )
  }

  const statusClasses: Record<string, string> = {
    clean: '',
    fixed: 'bg-blue-50 dark:bg-blue-950/30',
    warning: 'bg-yellow-50 dark:bg-yellow-950/30',
    error: 'bg-red-50 dark:bg-red-950/30',
  }

  return (
    <button
      type="button"
      onClick={() => { setValue(cell.value); setEditing(true) }}
      className={`w-full text-left px-1.5 py-0.5 rounded text-xs truncate min-h-[28px] cursor-text hover:ring-1 hover:ring-zinc-300 ${statusClasses[cell.status] ?? ''}`}
      title={cell.message || cell.value}
    >
      {cell.value || <span className="text-zinc-400 italic">empty</span>}
    </button>
  )
}
