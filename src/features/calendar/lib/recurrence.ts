import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  parseISO,
} from 'date-fns'
import { toISODate } from '@/lib/date'
import type { CalendarEvent, RecurrenceFreq } from '@/types/domain'

export interface DateRange {
  start: Date
  /** Exclusive. */
  end: Date
}

/** One concrete appearance of an event. Single events produce one, recurring masters produce one per repeat. */
export interface Occurrence {
  event: CalendarEvent
  start: Date
  end: Date
  /** Unique per occurrence: the event id, or `id@start` for repeats. */
  instanceKey: string
  isRecurring: boolean
}

const MAX_OCCURRENCES = 1000

const advance: Record<RecurrenceFreq, (date: Date, amount: number) => Date> = {
  daily: addDays,
  weekly: addWeeks,
  monthly: addMonths,
  yearly: addYears,
}

/** `date` moved forward by `amount` units of `freq`. Month ends clamp (31 Jan + 1 month is 28 Feb). Shared with task recurrence. */
export const advanceDate = (date: Date, freq: RecurrenceFreq, amount: number): Date => advance[freq](date, amount)

/** Whole units between two dates, used only to skip ahead to the range; the loop does the exact check. */
const unitsBetween: Record<RecurrenceFreq, (later: Date, earlier: Date) => number> = {
  daily: differenceInCalendarDays,
  weekly: (later, earlier) => Math.floor(differenceInCalendarDays(later, earlier) / 7),
  monthly: differenceInCalendarMonths,
  yearly: differenceInCalendarYears,
}

/** A zero-length event still occupies its own instant. */
const overlaps = (start: Date, end: Date, range: DateRange) =>
  start < range.end && Math.max(end.getTime(), start.getTime() + 1) > range.start.getTime()

export function expandRecurrence(events: CalendarEvent[], range: DateRange): Occurrence[] {
  const result: Occurrence[] = []
  for (const event of events) {
    const start = parseISO(event.start)
    const end = parseISO(event.end)
    const rule = event.recurrence

    if (!rule) {
      if (overlaps(start, end, range)) result.push({ event, start, end, instanceKey: event.id, isRecurring: false })
      continue
    }

    const interval = Math.max(1, rule.interval ?? 1)
    const until = rule.until ? parseISO(rule.until) : null
    const durationMs = end.getTime() - start.getTime()
    const spanDays = differenceInCalendarDays(end, start)
    const skipped = new Set(rule.exceptions)

    // Start a little before the first repeat that can reach the range, so long events and month clamping are safe.
    const lookback = new Date(range.start.getTime() - durationMs)
    const first = Math.max(0, Math.floor(unitsBetween[rule.freq](lookback, start) / interval) - 1)

    for (let n = first; n < first + MAX_OCCURRENCES; n++) {
      const occStart = advance[rule.freq](start, n * interval)
      if (occStart >= range.end || (until && occStart > until)) break
      const occEnd = event.allDay ? addDays(occStart, spanDays) : new Date(occStart.getTime() + durationMs)
      if (!overlaps(occStart, occEnd, range) || skipped.has(toISODate(occStart))) continue
      result.push({
        event,
        start: occStart,
        end: occEnd,
        instanceKey: `${event.id}@${occStart.toISOString()}`,
        isRecurring: true,
      })
    }
  }
  return result.sort((a, b) => a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime())
}
