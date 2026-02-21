import type { CleaningResult } from './types'

export function cleanPhone(raw: string): CleaningResult {
  const original = raw
  if (!raw.trim()) {
    return { cleaned: '', original, status: 'error', message: 'Phone number is required' }
  }

  const digits = raw.replace(/\D/g, '')
  let normalized = digits

  if (digits.length === 11 && digits.startsWith('1')) {
    normalized = digits.slice(1)
  }

  if (normalized.length !== 10) {
    return { cleaned: normalized, original, status: 'error', message: `Invalid: ${normalized.length} digits (need 10)` }
  }

  if (normalized === raw.trim()) {
    return { cleaned: normalized, original, status: 'clean', message: '' }
  }
  return { cleaned: normalized, original, status: 'fixed', message: 'Phone normalized' }
}

export function splitFullName(raw: string): { firstName: CleaningResult; lastName: CleaningResult } {
  const trimmed = raw.trim()
  if (!trimmed) {
    return {
      firstName: { cleaned: '', original: raw, status: 'error', message: 'Name is required' },
      lastName: { cleaned: '', original: raw, status: 'error', message: 'Name is required' },
    }
  }

  const isLastFirst = trimmed.includes(',')
  let first: string
  let last: string

  if (isLastFirst) {
    const parts = trimmed.split(',').map(p => p.trim())
    last = titleCase(parts[0])
    first = titleCase(parts[1] || '')
  } else {
    const parts = trimmed.split(/\s+/)
    first = titleCase(parts[0])
    last = titleCase(parts.slice(1).join(' '))
  }

  const wasModified = first !== raw.trim() || isLastFirst
  return {
    firstName: {
      cleaned: first,
      original: raw,
      status: wasModified ? 'fixed' : 'clean',
      message: wasModified ? 'Name split from full name' : '',
    },
    lastName: {
      cleaned: last,
      original: raw,
      status: wasModified ? 'fixed' : 'clean',
      message: wasModified ? 'Name split from full name' : '',
    },
  }
}

export function cleanFirstName(raw: string): CleaningResult {
  const original = raw
  if (!raw.trim()) {
    return { cleaned: '', original, status: 'error', message: 'First name is required' }
  }
  const cleaned = titleCase(raw.trim())
  if (cleaned === raw.trim()) {
    return { cleaned, original, status: 'clean', message: '' }
  }
  return { cleaned, original, status: 'fixed', message: 'Name formatted' }
}

export function cleanLastName(raw: string): CleaningResult {
  const original = raw
  const cleaned = titleCase(raw.trim())
  if (cleaned === raw.trim()) {
    return { cleaned, original, status: 'clean', message: '' }
  }
  return { cleaned, original, status: 'fixed', message: 'Name formatted' }
}

export function cleanDate(raw: string): CleaningResult {
  const original = raw
  const trimmed = raw.trim()
  if (!trimmed) {
    return { cleaned: '', original, status: 'clean', message: '' }
  }

  // Try ISO format first
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    const d = new Date(trimmed)
    if (isValidDate(d)) {
      return { cleaned: trimmed, original, status: 'clean', message: '' }
    }
  }

  // MM/DD/YYYY or M/D/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (slashMatch) {
    const [, p1, p2, year] = slashMatch
    const month = parseInt(p1)
    const day = parseInt(p2)

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const d = new Date(iso)
      if (isValidDate(d)) {
        return { cleaned: iso, original, status: 'fixed', message: 'Date normalized to ISO' }
      }
    }

    // Ambiguous: could be DD/MM/YYYY
    if (parseInt(p1) > 12 && parseInt(p2) <= 12) {
      const iso = `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`
      return { cleaned: iso, original, status: 'warning', message: 'Interpreted as DD/MM/YYYY' }
    }
  }

  // MM/DD/YY
  const shortYearMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/)
  if (shortYearMatch) {
    const [, p1, p2, shortYear] = shortYearMatch
    const fullYear = parseInt(shortYear) > 50 ? `19${shortYear}` : `20${shortYear}`
    const month = parseInt(p1)
    const day = parseInt(p2)
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const iso = `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      return { cleaned: iso, original, status: 'fixed', message: 'Date normalized' }
    }
  }

  // Excel serial number (days since Dec 30, 1899)
  const num = Number(trimmed)
  if (!isNaN(num) && num >= 25569 && num <= 73051) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const ms = excelEpoch.getTime() + num * 86400000
    const d = new Date(ms)
    if (isValidDate(d)) {
      const y = d.getUTCFullYear()
      const m = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')
      return { cleaned: `${y}-${m}-${day}`, original, status: 'fixed', message: 'Converted from Excel serial' }
    }
  }

  // Named month formats: "Jan 15, 2024", "January 15, 2024", "15-Jan-24", "15-Jan-2024"
  const namedMonthResult = parseNamedMonth(trimmed)
  if (namedMonthResult) {
    return { cleaned: namedMonthResult, original, status: 'fixed', message: 'Date normalized from named month' }
  }

  return { cleaned: trimmed, original, status: 'error', message: 'Unrecognized date format' }
}

export function cleanMileage(raw: string): CleaningResult {
  const original = raw
  const trimmed = raw.trim()
  if (!trimmed) {
    return { cleaned: '', original, status: 'clean', message: '' }
  }

  const cleaned = trimmed.replace(/[,\s]/g, '').replace(/(mi|miles|km)$/i, '')
  const num = parseInt(cleaned)

  if (isNaN(num)) {
    return { cleaned: '', original, status: 'error', message: 'Not a valid number' }
  }

  if (num < 0) {
    return { cleaned: String(num), original, status: 'error', message: 'Mileage cannot be negative' }
  }

  if (num > 500000) {
    return { cleaned: String(num), original, status: 'warning', message: 'Unusually high mileage' }
  }

  if (String(num) !== trimmed) {
    return { cleaned: String(num), original, status: 'fixed', message: 'Mileage cleaned' }
  }
  return { cleaned: String(num), original, status: 'clean', message: '' }
}

export function cleanEmail(raw: string): CleaningResult {
  const original = raw
  const trimmed = raw.trim()
  if (!trimmed) {
    return { cleaned: '', original, status: 'clean', message: '' }
  }

  const cleaned = trimmed.toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(cleaned)) {
    return { cleaned, original, status: 'error', message: 'Invalid email format' }
  }

  if (cleaned !== trimmed) {
    return { cleaned, original, status: 'fixed', message: 'Email lowercased' }
  }
  return { cleaned, original, status: 'clean', message: '' }
}

export function cleanYear(raw: string): CleaningResult {
  const original = raw
  const trimmed = raw.trim()
  if (!trimmed) {
    return { cleaned: '', original, status: 'clean', message: '' }
  }

  const year = parseInt(trimmed)
  if (isNaN(year)) {
    return { cleaned: '', original, status: 'error', message: 'Not a valid year' }
  }

  if (year < 1900 || year > 2100) {
    return { cleaned: String(year), original, status: 'error', message: 'Year out of range (1900-2100)' }
  }

  return { cleaned: String(year), original, status: 'clean', message: '' }
}

export function cleanVin(raw: string): CleaningResult {
  const original = raw
  const trimmed = raw.trim()
  if (!trimmed) {
    return { cleaned: '', original, status: 'clean', message: '' }
  }

  const cleaned = trimmed.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '')
  if (cleaned.length !== 17) {
    return { cleaned, original, status: 'warning', message: `VIN has ${cleaned.length} chars (expected 17)` }
  }

  if (cleaned !== trimmed) {
    return { cleaned, original, status: 'fixed', message: 'VIN uppercased' }
  }
  return { cleaned, original, status: 'clean', message: '' }
}

export function splitYearMakeModel(raw: string): {
  year: CleaningResult
  make: CleaningResult
  model: CleaningResult
} | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const parts = trimmed.split(/\s+/)
  const year = parseInt(parts[0])

  if (isNaN(year) || year < 1900 || year > 2100) return null
  if (parts.length < 3) return null

  return {
    year: { cleaned: String(year), original: parts[0], status: 'clean', message: '' },
    make: { cleaned: titleCase(parts[1]), original: parts[1], status: 'clean', message: '' },
    model: { cleaned: titleCase(parts.slice(2).join(' ')), original: parts.slice(2).join(' '), status: 'clean', message: '' },
  }
}

export function inferServiceType(description: string): string {
  const lower = description.toLowerCase()
  if (lower.includes('oil change') || lower.includes('oil filter') || lower.includes('5w')) {
    return 'oil_change'
  }
  if (lower.includes('tire rotation') || lower.includes('rotate')) return 'tire_rotation'
  if (lower.includes('inspection')) return 'state_inspection'
  if (lower.includes('brake')) return 'brake_service'
  if (lower.includes('transmission')) return 'transmission'
  return 'oil_change'
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
}

function parseNamedMonth(raw: string): string | null {
  // "Jan 15, 2024" or "January 15, 2024"
  const mdyMatch = raw.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/)
  if (mdyMatch) {
    const month = MONTHS[mdyMatch[1].toLowerCase()]
    const day = parseInt(mdyMatch[2])
    const year = parseInt(mdyMatch[3])
    if (month && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  // "15-Jan-24" or "15-Jan-2024"
  const dmyMatch = raw.match(/^(\d{1,2})[- ]([A-Za-z]+)[- ](\d{2,4})$/)
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1])
    const month = MONTHS[dmyMatch[2].toLowerCase()]
    const shortYear = dmyMatch[3]
    const year = shortYear.length === 2
      ? (parseInt(shortYear) > 50 ? `19${shortYear}` : `20${shortYear}`)
      : shortYear
    if (month && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  return null
}

function titleCase(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function isValidDate(d: Date): boolean {
  return d instanceof Date && !isNaN(d.getTime())
}

export function cleanGenericText(raw: string): CleaningResult {
  const original = raw
  const cleaned = raw.trim()
  if (cleaned !== raw && raw.length > 0) {
    return { cleaned, original, status: 'fixed', message: 'Whitespace trimmed' }
  }
  return { cleaned, original, status: 'clean', message: '' }
}
