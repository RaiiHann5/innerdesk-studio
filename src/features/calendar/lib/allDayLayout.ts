import type { DayItems } from './calendarItems'
import { packBars, type WeekBars } from './monthLayout'
import type { Occurrence } from './recurrence'

const DAY_MS = 24 * 60 * 60 * 1000

/** All-day events and anything lasting a full day or more sit in the "Seharian" row; shorter timed events go on the grid, even across midnight. */
export const belongsInAllDayRow = (o: Occurrence) => o.event.allDay || o.end.getTime() - o.start.getTime() >= DAY_MS

/** Occurrences that go on the time grid for one day. */
export const gridOccurrences = (day: DayItems) => day.timed.filter((o) => !belongsInAllDayRow(o))

/** Bars for the all-day row of a week or a single day. Lane count is unbounded here; the row decides how many to show. */
export function layoutAllDayRow(days: Date[], items: DayItems[]): WeekBars {
  const seen = new Map<string, Occurrence>()
  for (const day of items) {
    for (const o of [...day.allDay, ...day.timed]) if (belongsInAllDayRow(o)) seen.set(o.instanceKey, o)
  }
  return packBars(days, [...seen.values()], Number.POSITIVE_INFINITY)
}
