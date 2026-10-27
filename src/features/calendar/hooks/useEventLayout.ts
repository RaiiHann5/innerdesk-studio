import { useMemo } from 'react'
import { toISODate } from '@/lib/date'
import { EMPTY_DAY, type DayItems, type TimedTask } from '../lib/calendarItems'
import { gridOccurrences, layoutAllDayRow } from '../lib/allDayLayout'
import type { WeekBars } from '../lib/monthLayout'
import { layoutDay, type PlacedItem } from '../lib/overlap'
import type { Occurrence } from '../lib/recurrence'
import { MIN_EVENT_MINUTES } from '../lib/timeGeometry'

export interface DayColumnLayout {
  day: Date
  key: string
  placed: PlacedItem<Occurrence>[]
  tasks: DayItems['tasks']
  /** Milestones due that day. They sit in the all-day row, before the tasks. */
  milestones: DayItems['milestones']
  /** Tasks that carry a time of day and therefore sit on the hour grid. */
  timedTasks: TimedTask[]
}

export interface TimeGridLayout {
  allDay: WeekBars
  columns: DayColumnLayout[]
}

/** Everything the time grid draws, computed once per data change. It does not depend on the clock, so the now line never triggers it. */
export function useEventLayout(days: Date[], items: Map<string, DayItems>): TimeGridLayout {
  return useMemo(() => {
    const perDay = days.map((day) => items.get(toISODate(day)) ?? EMPTY_DAY)
    return {
      allDay: layoutAllDayRow(days, perDay),
      columns: days.map((day, i) => ({
        day,
        key: toISODate(day),
        placed: layoutDay(gridOccurrences(perDay[i]), day, MIN_EVENT_MINUTES),
        tasks: perDay[i].tasks,
        milestones: perDay[i].milestones,
        timedTasks: perDay[i].timedTasks,
      })),
    }
  }, [days, items])
}
