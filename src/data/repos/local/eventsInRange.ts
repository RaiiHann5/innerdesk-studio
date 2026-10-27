import type { CalendarEvent, IsoRange } from '@/types/domain'

/** Mirrors what a database range query would return: overlapping events, and recurring masters still active. */
export function touchesRange(event: CalendarEvent, range: IsoRange): boolean {
  if (event.start >= range.end) return false
  if (event.recurrence) return !event.recurrence.until || event.recurrence.until >= range.start
  return event.end > range.start || event.start >= range.start
}
