import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  STATUS_COLORS,
  getStatusColor,
  getStatusFromDueDate,
  calculateNextDueDate,
  calculateNextDueMileage,
} from '@/lib/customer-status'

vi.mock('@prisma/client', () => ({
  CustomerStatus: {
    overdue: 'overdue',
    due_now: 'due_now',
    due_soon: 'due_soon',
    up_to_date: 'up_to_date',
  },
}))

describe('STATUS_COLORS', () => {
  it('has all four statuses', () => {
    expect(STATUS_COLORS).toHaveProperty('overdue')
    expect(STATUS_COLORS).toHaveProperty('due_now')
    expect(STATUS_COLORS).toHaveProperty('due_soon')
    expect(STATUS_COLORS).toHaveProperty('up_to_date')
  })

  it('each status has required style keys', () => {
    for (const status of Object.values(STATUS_COLORS)) {
      expect(status).toHaveProperty('bg')
      expect(status).toHaveProperty('text')
      expect(status).toHaveProperty('border')
      expect(status).toHaveProperty('label')
      expect(status).toHaveProperty('dot')
    }
  })
})

describe('getStatusColor', () => {
  it('returns correct colors for each status', () => {
    expect(getStatusColor('overdue' as never)).toBe(STATUS_COLORS.overdue)
    expect(getStatusColor('due_now' as never)).toBe(STATUS_COLORS.due_now)
    expect(getStatusColor('due_soon' as never)).toBe(STATUS_COLORS.due_soon)
    expect(getStatusColor('up_to_date' as never)).toBe(STATUS_COLORS.up_to_date)
  })

  it('defaults to up_to_date for unknown status', () => {
    expect(getStatusColor('unknown' as never)).toBe(STATUS_COLORS.up_to_date)
  })
})

describe('getStatusFromDueDate', () => {
  beforeEach(() => {
    const fixedNow = new Date('2026-02-14T12:00:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(fixedNow)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns overdue when due date is in the past', () => {
    const pastDate = new Date('2026-02-01')
    const result = getStatusFromDueDate(pastDate, 100000, 50000)
    expect(result).toBe('overdue')
  })

  it('returns overdue when current mileage exceeds due mileage', () => {
    const futureDate = new Date('2026-12-01')
    const result = getStatusFromDueDate(futureDate, 50000, 51000)
    expect(result).toBe('overdue')
  })

  it('returns due_now when due date is within 7 days', () => {
    const sevenDaysOut = new Date('2026-02-20')
    const result = getStatusFromDueDate(sevenDaysOut, 100000, 50000)
    expect(result).toBe('due_now')
  })

  it('returns due_now when mileage is within 500 miles of due', () => {
    const farFuture = new Date('2026-12-01')
    const result = getStatusFromDueDate(farFuture, 50400, 50000)
    expect(result).toBe('due_now')
  })

  it('returns due_soon when due date is within 30 days', () => {
    const twentyDaysOut = new Date('2026-03-06')
    const result = getStatusFromDueDate(twentyDaysOut, 100000, 50000)
    expect(result).toBe('due_soon')
  })

  it('returns due_soon when mileage is within 1000 miles of due', () => {
    const farFuture = new Date('2026-12-01')
    const result = getStatusFromDueDate(farFuture, 50800, 50000)
    expect(result).toBe('due_soon')
  })

  it('returns up_to_date when far from due', () => {
    const farFuture = new Date('2026-12-01')
    const result = getStatusFromDueDate(farFuture, 100000, 50000)
    expect(result).toBe('up_to_date')
  })

  it('returns overdue when exactly at due mileage', () => {
    const farFuture = new Date('2026-12-01')
    const result = getStatusFromDueDate(farFuture, 50000, 50000)
    expect(result).toBe('overdue')
  })
})

describe('calculateNextDueDate', () => {
  it('uses default 90 days when no interval provided', () => {
    const serviceDate = new Date(2026, 0, 15) // Jan 15 2026
    const result = calculateNextDueDate(serviceDate)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(3) // April (0-indexed)
    expect(result.getDate()).toBe(15)
  })

  it('accepts custom interval in days', () => {
    const serviceDate = new Date(2026, 0, 1) // Jan 1 2026
    const result = calculateNextDueDate(serviceDate, 180) // 180 days
    // Jan 1 + 180 days = June 30
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(5) // June (0-indexed)
    expect(result.getDate()).toBe(30)
  })

  it('handles null interval (falls back to 90 days)', () => {
    const serviceDate = new Date(2026, 0, 15) // Jan 15 2026
    const result = calculateNextDueDate(serviceDate, null)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(3) // April
    expect(result.getDate()).toBe(15)
  })

  it('handles 365-day interval', () => {
    const serviceDate = new Date(2026, 0, 1) // Jan 1 2026
    const result = calculateNextDueDate(serviceDate, 365)
    expect(result.getFullYear()).toBe(2027)
    expect(result.getMonth()).toBe(0) // January
    expect(result.getDate()).toBe(1)
  })

  it('does not mutate the input date', () => {
    const serviceDate = new Date('2026-01-15')
    const originalTime = serviceDate.getTime()
    calculateNextDueDate(serviceDate)
    expect(serviceDate.getTime()).toBe(originalTime)
  })
})

describe('calculateNextDueMileage', () => {
  it('uses default 5000 miles when no interval provided', () => {
    expect(calculateNextDueMileage(50000)).toBe(55000)
  })

  it('accepts custom mileage interval', () => {
    expect(calculateNextDueMileage(50000, 7500)).toBe(57500)
  })

  it('handles null interval (falls back to 5000)', () => {
    expect(calculateNextDueMileage(50000, null)).toBe(55000)
  })

  it('works with 0 mileage', () => {
    expect(calculateNextDueMileage(0)).toBe(5000)
  })

  it('works with large mileage and custom interval', () => {
    expect(calculateNextDueMileage(200000, 30000)).toBe(230000)
  })
})
