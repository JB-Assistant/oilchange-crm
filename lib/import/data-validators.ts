import type {
  FieldMapping, CleanedRow, CleanedCell, ValidationSummary,
  SystemField, DuplicateInfo, CleaningStatus,
} from './types'
import {
  cleanPhone, cleanFirstName, cleanLastName, cleanDate,
  cleanMileage, cleanEmail, cleanYear, cleanVin,
  splitFullName, splitYearMakeModel, cleanGenericText,
} from './data-cleaners'

function makeCell(field: SystemField, value: string, status: CleaningStatus, message: string, original: string): CleanedCell {
  return { value, original, status, message, field }
}

function emptyCell(field: SystemField): CleanedCell {
  return { value: '', original: '', status: 'clean', message: '', field }
}

export function applyCleaningPipeline(
  rows: string[][],
  headers: string[],
  mappings: FieldMapping[]
): { rows: CleanedRow[]; summary: ValidationSummary } {
  const summary: ValidationSummary = {
    totalRows: rows.length,
    cleanRows: 0,
    warningRows: 0,
    errorRows: 0,
    fixedCells: 0,
    phonesCleaned: 0,
    namesSplit: 0,
    datesNormalized: 0,
  }

  const activeMappings = mappings.filter(m => m.targetField !== 'skip')
  const hasFullName = activeMappings.some(m => m.targetField === 'fullName')
  const hasYMM = activeMappings.some(m => m.targetField === 'yearMakeModel')

  const cleanedRows: CleanedRow[] = rows.map((row, rowIndex) => {
    const cells: Partial<Record<SystemField, CleanedCell>> = {}
    let hasError = false
    let hasWarning = false

    for (const mapping of activeMappings) {
      const colIdx = headers.indexOf(mapping.sourceHeader)
      const rawValue = colIdx >= 0 ? (row[colIdx] ?? '') : ''
      const field = mapping.targetField

      switch (field) {
        case 'phone': {
          const r = cleanPhone(rawValue)
          cells.phone = makeCell('phone', r.cleaned, r.status, r.message, r.original)
          if (r.status === 'fixed') summary.phonesCleaned++
          break
        }
        case 'firstName': {
          const r = cleanFirstName(rawValue)
          cells.firstName = makeCell('firstName', r.cleaned, r.status, r.message, r.original)
          break
        }
        case 'lastName': {
          const r = cleanLastName(rawValue)
          cells.lastName = makeCell('lastName', r.cleaned, r.status, r.message, r.original)
          break
        }
        case 'fullName': {
          const { firstName, lastName } = splitFullName(rawValue)
          cells.firstName = makeCell('firstName', firstName.cleaned, firstName.status, firstName.message, firstName.original)
          cells.lastName = makeCell('lastName', lastName.cleaned, lastName.status, lastName.message, lastName.original)
          if (firstName.status === 'fixed') summary.namesSplit++
          break
        }
        case 'email': {
          const r = cleanEmail(rawValue)
          cells.email = makeCell('email', r.cleaned, r.status, r.message, r.original)
          break
        }
        case 'vehicleYear': {
          const r = cleanYear(rawValue)
          cells.vehicleYear = makeCell('vehicleYear', r.cleaned, r.status, r.message, r.original)
          break
        }
        case 'vehicleMake': {
          const r = cleanGenericText(rawValue)
          cells.vehicleMake = makeCell('vehicleMake', r.cleaned, r.status, r.message, r.original)
          break
        }
        case 'vehicleModel': {
          const r = cleanGenericText(rawValue)
          cells.vehicleModel = makeCell('vehicleModel', r.cleaned, r.status, r.message, r.original)
          break
        }
        case 'yearMakeModel': {
          const parsed = splitYearMakeModel(rawValue)
          if (parsed) {
            cells.vehicleYear = makeCell('vehicleYear', parsed.year.cleaned, parsed.year.status, '', rawValue)
            cells.vehicleMake = makeCell('vehicleMake', parsed.make.cleaned, parsed.make.status, '', rawValue)
            cells.vehicleModel = makeCell('vehicleModel', parsed.model.cleaned, parsed.model.status, '', rawValue)
          } else if (rawValue.trim()) {
            cells.vehicleYear = makeCell('vehicleYear', '', 'error', 'Could not parse Year/Make/Model', rawValue)
          }
          break
        }
        case 'vin': {
          const r = cleanVin(rawValue)
          cells.vin = makeCell('vin', r.cleaned, r.status, r.message, r.original)
          break
        }
        case 'licensePlate': {
          const r = cleanGenericText(rawValue)
          cells.licensePlate = makeCell('licensePlate', r.cleaned, r.status, r.message, r.original)
          break
        }
        case 'lastServiceDate': {
          const r = cleanDate(rawValue)
          cells.lastServiceDate = makeCell('lastServiceDate', r.cleaned, r.status, r.message, r.original)
          if (r.status === 'fixed') summary.datesNormalized++
          break
        }
        case 'lastServiceMileage': {
          const r = cleanMileage(rawValue)
          cells.lastServiceMileage = makeCell('lastServiceMileage', r.cleaned, r.status, r.message, r.original)
          break
        }
        case 'repairDescription': {
          const r = cleanGenericText(rawValue)
          cells.repairDescription = makeCell('repairDescription', r.cleaned, r.status, r.message, r.original)
          break
        }
      }
    }

    // Ensure required fields exist
    if (!cells.firstName) {
      cells.firstName = hasFullName
        ? emptyCell('firstName')
        : makeCell('firstName', '', 'error', 'First name is required', '')
    }
    if (!cells.phone) {
      cells.phone = makeCell('phone', '', 'error', 'Phone number is required', '')
    }

    // Fill missing optional fields
    const optionalFields: SystemField[] = [
      'lastName', 'email', 'vehicleYear', 'vehicleMake', 'vehicleModel',
      'vin', 'licensePlate', 'lastServiceDate', 'lastServiceMileage', 'repairDescription',
    ]
    for (const f of optionalFields) {
      if (!cells[f]) cells[f] = emptyCell(f)
    }

    // Count statuses
    for (const cell of Object.values(cells)) {
      if (!cell) continue
      if (cell.status === 'error') hasError = true
      if (cell.status === 'warning') hasWarning = true
      if (cell.status === 'fixed') summary.fixedCells++
    }

    return {
      cells: cells as Record<SystemField, CleanedCell>,
      rowIndex,
      hasError,
      hasWarning,
    }
  })

  summary.cleanRows = cleanedRows.filter(r => !r.hasError && !r.hasWarning).length
  summary.warningRows = cleanedRows.filter(r => r.hasWarning && !r.hasError).length
  summary.errorRows = cleanedRows.filter(r => r.hasError).length

  return { rows: cleanedRows, summary }
}

export function detectInternalDuplicates(rows: CleanedRow[]): DuplicateInfo[] {
  const seen = new Map<string, number>()
  const duplicates: DuplicateInfo[] = []

  for (const row of rows) {
    const phone = row.cells.phone?.value
    if (!phone) continue

    const prevIdx = seen.get(phone)
    if (prevIdx !== undefined) {
      const name = `${row.cells.firstName?.value ?? ''} ${row.cells.lastName?.value ?? ''}`.trim()
      duplicates.push({ phone, rowIndex: row.rowIndex, name, type: 'internal' })
    } else {
      seen.set(phone, row.rowIndex)
    }
  }

  return duplicates
}
