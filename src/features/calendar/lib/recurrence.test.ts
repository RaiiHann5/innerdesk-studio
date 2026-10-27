import { describe, expect, it } from 'vitest'
import { toISODate } from '@/lib/date'
import { expandRecurrence } from './recurrence'
import { makeEvent } from './testing'

const d = (y: number, m: number, day: number, h = 9, min = 0) => new Date(y, m - 1, day, h, min)
const days = (occurrences: ReturnType<typeof expandRecurrence>) => occurrences.map((o) => toISODate(o.start))

describe('expandRecurrence', () => {
  it('returns a single event once, only when it overlaps the range', () => {
    const event = makeEvent({ start: d(2026, 10, 10, 10), end: d(2026, 10, 10, 11) })
    expect(expandRecurrence([event], { start: d(2026, 10, 1, 0), end: d(2026, 11, 1, 0) })).toHaveLength(1)
    expect(expandRecurrence([event], { start: d(2026, 10, 11, 0), end: d(2026, 10, 12, 0) })).toHaveLength(0)
  })

  it('keeps an event that began before the range and ends inside it', () => {
    const event = makeEvent({ start: d(2026, 10, 9, 22), end: d(2026, 10, 10, 1) })
    expect(expandRecurrence([event], { start: d(2026, 10, 10, 0), end: d(2026, 10, 11, 0) })).toHaveLength(1)
  })

  it('does not include an event that ends exactly when the range starts', () => {
    const event = makeEvent({ start: d(2026, 10, 9, 22), end: d(2026, 10, 10, 0) })
    expect(expandRecurrence([event], { start: d(2026, 10, 10, 0), end: d(2026, 10, 11, 0) })).toHaveLength(0)
  })

  it('expands daily events with an interval', () => {
    const event = makeEvent({
      start: d(2026, 10, 1),
      end: d(2026, 10, 1, 10),
      recurrence: { freq: 'daily', interval: 3, exceptions: [] },
    })
    const result = expandRecurrence([event], { start: d(2026, 10, 1, 0), end: d(2026, 10, 11, 0) })
    expect(days(result)).toEqual(['2026-10-01', '2026-10-04', '2026-10-07', '2026-10-10'])
  })

  it('expands weekly events starting mid-series and keeps the weekday', () => {
    const event = makeEvent({
      start: d(2026, 8, 3, 6),
      end: d(2026, 8, 3, 7),
      recurrence: { freq: 'weekly', exceptions: [] },
    })
    const result = expandRecurrence([event], { start: d(2026, 10, 5, 0), end: d(2026, 10, 19, 0) })
    expect(days(result)).toEqual(['2026-10-05', '2026-10-12'])
    expect(result[0].end.getHours()).toBe(7)
  })

  it('clamps monthly repeats on the 31st to the last day of shorter months', () => {
    const event = makeEvent({
      start: d(2026, 1, 31),
      end: d(2026, 1, 31, 10),
      recurrence: { freq: 'monthly', exceptions: [] },
    })
    const result = expandRecurrence([event], { start: d(2026, 1, 1, 0), end: d(2026, 5, 1, 0) })
    expect(days(result)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
  })

  it('moves a yearly 29 February to 28 February in common years', () => {
    const event = makeEvent({
      start: d(2024, 2, 29),
      end: d(2024, 2, 29, 10),
      recurrence: { freq: 'yearly', exceptions: [] },
    })
    const result = expandRecurrence([event], { start: d(2024, 1, 1, 0), end: d(2029, 1, 1, 0) })
    expect(days(result)).toEqual(['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29'])
  })

  it('stops after the until date, inclusive', () => {
    const event = makeEvent({
      start: d(2026, 10, 1),
      end: d(2026, 10, 1, 10),
      recurrence: { freq: 'daily', until: d(2026, 10, 3, 9).toISOString(), exceptions: [] },
    })
    const result = expandRecurrence([event], { start: d(2026, 10, 1, 0), end: d(2026, 10, 30, 0) })
    expect(days(result)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03'])
  })

  it('skips exception dates', () => {
    const event = makeEvent({
      start: d(2026, 10, 1),
      end: d(2026, 10, 1, 10),
      recurrence: { freq: 'daily', exceptions: ['2026-10-02'] },
    })
    const result = expandRecurrence([event], { start: d(2026, 10, 1, 0), end: d(2026, 10, 4, 0) })
    expect(days(result)).toEqual(['2026-10-01', '2026-10-03'])
  })

  it('includes a repeat that started before the range and runs into it', () => {
    const event = makeEvent({
      start: d(2026, 10, 1, 22),
      end: d(2026, 10, 2, 2),
      recurrence: { freq: 'daily', exceptions: [] },
    })
    const result = expandRecurrence([event], { start: d(2026, 10, 10, 0), end: d(2026, 10, 10, 6) })
    expect(days(result)).toEqual(['2026-10-09'])
  })

  it('keeps multi-day all-day repeats the same number of calendar days', () => {
    const event = makeEvent({
      allDay: true,
      start: d(2026, 1, 5, 0),
      end: d(2026, 1, 8, 0),
      recurrence: { freq: 'monthly', exceptions: [] },
    })
    const [, second] = expandRecurrence([event], { start: d(2026, 1, 1, 0), end: d(2026, 3, 1, 0) })
    expect(toISODate(second.start)).toBe('2026-02-05')
    expect(toISODate(second.end)).toBe('2026-02-08')
  })

  it('gives each repeat its own instance key and sorts by start', () => {
    const repeating = makeEvent({ id: 'a', start: d(2026, 10, 1, 12), end: d(2026, 10, 1, 13), recurrence: { freq: 'daily', exceptions: [] } })
    const single = makeEvent({ id: 'b', start: d(2026, 10, 2, 8), end: d(2026, 10, 2, 9) })
    const result = expandRecurrence([repeating, single], { start: d(2026, 10, 1, 0), end: d(2026, 10, 3, 0) })
    expect(result.map((o) => o.event.id)).toEqual(['a', 'b', 'a'])
    expect(new Set(result.map((o) => o.instanceKey)).size).toBe(3)
  })
})
