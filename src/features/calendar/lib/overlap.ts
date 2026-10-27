import { addDays, startOfDay } from 'date-fns'

export interface Timed {
  start: Date
  end: Date
}

export interface PlacedItem<T extends Timed> {
  item: T
  /** Minutes from the start of the day, already clipped to the day. */
  startMin: number
  /** Minutes from the start of the day, clipped, and never shorter than the minimum height. */
  endMin: number
  /** Zero-based column inside the overlap cluster. */
  column: number
  /** Columns in the cluster; the event's slot is 1/columns of the width. */
  columns: number
  /** Columns the event may cover: it grows right over columns that are free for its whole duration. */
  span: number
  /** The event started on an earlier day. */
  continuesBefore: boolean
  /** The event runs on into the next day. */
  continuesAfter: boolean
}

export const MINUTES_PER_DAY = 24 * 60

interface Clipped<T extends Timed> {
  item: T
  startMin: number
  endMin: number
  continuesBefore: boolean
  continuesAfter: boolean
}

/**
 * Column packing for one day. Events that overlap, directly or through a chain, form a cluster; inside it each
 * event takes the first column that is free, so nothing is ever drawn on top of another. `minMinutes` is the
 * shortest height an event is drawn at, so a 5 minute event that is drawn taller still counts as occupying that time.
 */
export function layoutDay<T extends Timed>(items: T[], day: Date, minMinutes: number): PlacedItem<T>[] {
  const dayStart = startOfDay(day)
  const dayEnd = addDays(dayStart, 1)

  const clipped: Clipped<T>[] = []
  for (const item of items) {
    const touches = item.start < dayEnd && (item.end > dayStart || item.start >= dayStart)
    if (!touches) continue
    const startMin = Math.max(0, (item.start.getTime() - dayStart.getTime()) / 60_000)
    const realEnd = Math.min(MINUTES_PER_DAY, (item.end.getTime() - dayStart.getTime()) / 60_000)
    clipped.push({
      item,
      startMin,
      endMin: Math.min(MINUTES_PER_DAY, Math.max(realEnd, startMin + minMinutes)),
      continuesBefore: item.start < dayStart,
      continuesAfter: item.end > dayEnd,
    })
  }
  clipped.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin)

  const placed: PlacedItem<T>[] = []
  let cluster: Array<Clipped<T> & { column: number }> = []
  let columnEnds: number[] = []
  let clusterEnd = 0

  const flush = () => {
    const columns = columnEnds.length
    for (const entry of cluster) {
      let span = 1
      while (entry.column + span < columns && !cluster.some((o) => o.column === entry.column + span && o.startMin < entry.endMin && o.endMin > entry.startMin)) {
        span += 1
      }
      placed.push({ ...entry, columns, span })
    }
    cluster = []
    columnEnds = []
  }

  for (const entry of clipped) {
    if (cluster.length > 0 && entry.startMin >= clusterEnd) flush()
    let column = columnEnds.findIndex((end) => end <= entry.startMin)
    if (column === -1) column = columnEnds.length
    columnEnds[column] = entry.endMin
    clusterEnd = cluster.length === 0 ? entry.endMin : Math.max(clusterEnd, entry.endMin)
    cluster.push({ ...entry, column })
  }
  flush()
  return placed
}
