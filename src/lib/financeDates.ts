/**
 * Calendar arithmetic on plain strings: dates are yyyy-MM-dd, months are yyyy-MM, and neither carries a time zone.
 * Everything runs in UTC so a device in any zone, or across a daylight-saving change, gets the same answer.
 */

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export const isMonth = (value: string | null | undefined): value is string => typeof value === 'string' && MONTH_RE.test(value)

/** True for a real calendar date, so 2026-02-30 is not one. */
export function isIsoDate(value: string | null | undefined): value is string {
  if (typeof value !== 'string') return false
  const m = DATE_RE.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(`${m[1]}-${m[2]}`) && y > 0
}

export const monthOf = (date: string): string => date.slice(0, 7)
export const dayOfMonth = (date: string): number => Number(date.slice(8, 10))

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** `month` moved by `by` months, which may be negative. */
export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number)
  const index = y * 12 + (m - 1) + by
  const year = Math.floor(index / 12)
  return `${String(year).padStart(4, '0')}-${String((index % 12 + 12) % 12 + 1).padStart(2, '0')}`
}

const toUtc = (date: string): number => {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
const DAY_MS = 86_400_000

export function addDaysIso(date: string, days: number): string {
  return new Date(toUtc(date) + days * DAY_MS).toISOString().slice(0, 10)
}

/** Whole days from `from` to `to`. Positive when `to` is later. */
export const diffDays = (from: string, to: string): number => Math.round((toUtc(to) - toUtc(from)) / DAY_MS)
