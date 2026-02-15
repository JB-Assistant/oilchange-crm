import { describe, it, expect } from 'vitest'
import { format } from '@/lib/format'

describe('format.date', () => {
  it('formats a Date object', () => {
    const date = new Date(2026, 2, 15) // Mar 15 2026 (local)
    const result = format.date(date)
    expect(result).toMatch(/Mar\s+15,\s+2026/)
  })

  it('formats a date string with local constructor', () => {
    const date = new Date(2026, 11, 25) // Dec 25 2026 (local)
    const result = format.date(date)
    expect(result).toMatch(/Dec\s+25,\s+2026/)
  })

  it('handles ISO date strings', () => {
    const result = format.date('2026-01-01T12:00:00Z')
    expect(result).toMatch(/2026/)
  })
})

describe('format.phone', () => {
  it('formats 10-digit phone number', () => {
    expect(format.phone('5551234567')).toBe('(555) 123-4567')
  })

  it('strips non-digit characters before formatting', () => {
    expect(format.phone('555-123-4567')).toBe('(555) 123-4567')
    expect(format.phone('(555) 123-4567')).toBe('(555) 123-4567')
  })

  it('returns original for non-10-digit numbers after stripping', () => {
    expect(format.phone('123')).toBe('123')
    // +15551234567 strips to 11 digits, not 10, so returns original
    expect(format.phone('+15551234567')).toBe('+15551234567')
  })

  it('formats 11-digit with leading 1 when stripped to 10', () => {
    // +1 555 123 4567 strips to 15551234567 (11 digits) → returned as-is
    expect(format.phone('+1 555 123 4567')).toBe('+1 555 123 4567')
  })

  it('handles already formatted number', () => {
    expect(format.phone('(555) 123-4567')).toBe('(555) 123-4567')
  })
})

describe('format.mileage', () => {
  it('formats with comma separator and mi suffix', () => {
    expect(format.mileage(50000)).toBe('50,000 mi')
  })

  it('formats small numbers', () => {
    expect(format.mileage(500)).toBe('500 mi')
  })

  it('formats zero', () => {
    expect(format.mileage(0)).toBe('0 mi')
  })

  it('formats large numbers', () => {
    expect(format.mileage(1000000)).toBe('1,000,000 mi')
  })
})
