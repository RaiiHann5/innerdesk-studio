import { describe, expect, it } from 'vitest'
import { toISODate } from '@/lib/date'
import { getVisibleRange, paddedRange, periodTitle, shiftDate } from './range'

const date = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12)
const iso = (r: { start: Date; end: Date }) => [toISODate(r.start), toISODate(r.end)]

describe('getVisibleRange', () => {
  it('covers one day', () => {
    expect(iso(getVisibleRange('day', date(2026, 10, 10)))).toEqual(['2026-10-10', '2026-10-11'])
  })

  it('starts weeks on Monday', () => {
    expect(iso(getVisibleRange('week', date(2026, 10, 10)))).toEqual(['2026-10-05', '2026-10-12'])
    expect(iso(getVisibleRange('week', date(2026, 10, 11)))).toEqual(['2026-10-05', '2026-10-12'])
  })

  it('always shows six rows for a month, including neighbouring days', () => {
    // 1 Oct 2026 is a Thursday, so the grid starts Monday 28 Sep.
    expect(iso(getVisibleRange('month', date(2026, 10, 10)))).toEqual(['2026-09-28', '2026-11-09'])
    // 1 Feb 2027 is a Monday: the grid starts that day.
    expect(iso(getVisibleRange('month', date(2027, 2, 14)))).toEqual(['2027-02-01', '2027-03-15'])
  })

  it('covers the calendar year', () => {
    expect(iso(getVisibleRange('year', date(2026, 10, 10)))).toEqual(['2026-01-01', '2027-01-01'])
  })
})

describe('periodTitle', () => {
  it('formats each view in Indonesian', () => {
    expect(periodTitle('month', date(2026, 10, 10))).toBe('Oktober 2026')
    expect(periodTitle('day', date(2026, 10, 10))).toBe('Sabtu, 10 Okt 2026')
    expect(periodTitle('year', date(2026, 10, 10))).toBe('2026')
  })

  it('collapses the week range when it stays in one month, one year, or neither', () => {
    expect(periodTitle('week', date(2026, 10, 14))).toBe('12 - 18 Okt 2026')
    expect(periodTitle('week', date(2026, 9, 30))).toBe('28 Sep - 4 Okt 2026')
    expect(periodTitle('week', date(2026, 12, 31))).toBe('28 Des 2026 - 3 Jan 2027')
  })
})

describe('shiftDate', () => {
  it('moves by the unit of the view', () => {
    const d = date(2026, 10, 10)
    expect(toISODate(shiftDate('day', d, 1))).toBe('2026-10-11')
    expect(toISODate(shiftDate('week', d, -1))).toBe('2026-10-03')
    expect(toISODate(shiftDate('month', d, 1))).toBe('2026-11-10')
    expect(toISODate(shiftDate('year', d, -1))).toBe('2025-10-10')
  })

  it('does not overflow when the next month is shorter', () => {
    expect(toISODate(shiftDate('month', date(2026, 1, 31), 1))).toBe('2026-02-28')
  })
})

describe('paddedRange', () => {
  it('adds one span on each side', () => {
    const padded = paddedRange({ start: date(2026, 10, 5), end: date(2026, 10, 12) })
    expect(iso(padded)).toEqual(['2026-09-28', '2026-10-19'])
  })
})
