import { describe, expect, it } from 'vitest'
import { addDaysIso, dayOfMonth, daysInMonth, diffDays, isIsoDate, isMonth, monthOf, shiftMonth } from './financeDates'

describe('financeDates', () => {
  it('reads month and day from a plain date', () => {
    expect(monthOf('2026-10-15')).toBe('2026-10')
    expect(dayOfMonth('2026-10-05')).toBe(5)
  })

  it('knows month lengths, including a leap February', () => {
    expect(daysInMonth('2026-02')).toBe(28)
    expect(daysInMonth('2028-02')).toBe(29)
    expect(daysInMonth('2026-10')).toBe(31)
  })

  it('shifts months across year boundaries in both directions', () => {
    expect(shiftMonth('2026-10', 1)).toBe('2026-11')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-03', -15)).toBe('2024-12')
    expect(shiftMonth('2026-10', 12)).toBe('2027-10')
  })

  it('adds days without drifting across month ends or daylight saving', () => {
    expect(addDaysIso('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDaysIso('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDaysIso('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDaysIso('2026-10-15', 7 * 4)).toBe('2026-11-12')
  })

  it('counts whole days, positive when the second date is later', () => {
    expect(diffDays('2026-10-15', '2026-10-20')).toBe(5)
    expect(diffDays('2026-10-15', '2026-10-10')).toBe(-5)
    expect(diffDays('2026-10-15', '2026-10-15')).toBe(0)
    expect(diffDays('2026-12-31', '2027-01-01')).toBe(1)
  })

  it('accepts only real months and dates', () => {
    expect(isMonth('2026-10')).toBe(true)
    expect(isMonth('2026-13')).toBe(false)
    expect(isMonth('2026-1')).toBe(false)
    expect(isMonth(null)).toBe(false)
    expect(isIsoDate('2026-02-28')).toBe(true)
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('2026-2-3')).toBe(false)
    expect(isIsoDate(undefined)).toBe(false)
  })
})
