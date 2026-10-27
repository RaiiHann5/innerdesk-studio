import { differenceInCalendarDays } from 'date-fns'
import type { DayItems } from './calendarItems'
import type { Occurrence } from './recurrence'

/** The last instant an occurrence covers; end is exclusive, so a midnight end belongs to the day before. */
export const lastInstant = (o: Occurrence) => new Date(Math.max(o.end.getTime() - 1, o.start.getTime()))

export const isMultiDay = (o: Occurrence) => differenceInCalendarDays(lastInstant(o), o.start) >= 1

export interface BarSegment {
  occurrence: Occurrence
  startCol: number
  endCol: number
  lane: number
  /** The event began in an earlier week. */
  continuesBefore: boolean
  /** The event runs into a later week. */
  continuesAfter: boolean
}

export interface WeekBars {
  segments: BarSegment[]
  /** Lanes actually used, so every cell in the week reserves the same height. */
  laneCount: number
}

/** Packs the multi-day events of one week row into lanes. Bars that would need more than `maxLanes` stay out of the row. */
export function layoutWeekBars(weekDays: Date[], weekItems: DayItems[], maxLanes: number): WeekBars {
  const seen = new Map<string, Occurrence>()
  for (const day of weekItems) {
    for (const o of [...day.allDay, ...day.timed]) if (isMultiDay(o)) seen.set(o.instanceKey, o)
  }
  return packBars(weekDays, [...seen.values()], maxLanes)
}

/** Lays occurrences out as horizontal bars over a row of day columns, first-fit into lanes. Shared by the month rows and the all-day row. */
export function packBars(days: Date[], occurrences: Occurrence[], maxLanes: number): WeekBars {
  const lastCol = days.length - 1
  const candidates = occurrences
    .map((occurrence) => ({
      occurrence,
      startCol: Math.max(0, differenceInCalendarDays(occurrence.start, days[0])),
      endCol: Math.min(lastCol, differenceInCalendarDays(lastInstant(occurrence), days[0])),
      continuesBefore: differenceInCalendarDays(occurrence.start, days[0]) < 0,
      continuesAfter: differenceInCalendarDays(lastInstant(occurrence), days[0]) > lastCol,
    }))
    .sort(
      (a, b) =>
        a.startCol - b.startCol ||
        b.endCol - b.startCol - (a.endCol - a.startCol) ||
        a.occurrence.start.getTime() - b.occurrence.start.getTime(),
    )

  const laneEnds: number[] = []
  const segments: BarSegment[] = []
  for (const candidate of candidates) {
    let lane = laneEnds.findIndex((end) => end < candidate.startCol)
    if (lane === -1) lane = laneEnds.length
    if (lane >= maxLanes) continue
    laneEnds[lane] = candidate.endCol
    segments.push({ ...candidate, lane })
  }
  return { segments, laneCount: laneEnds.length }
}
