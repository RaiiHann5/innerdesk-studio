import { useMemo } from 'react'
import { addDays, startOfDay } from 'date-fns'
import { fmt, toISODate } from '@/lib/date'
import { useEventStore, useProjectStore, useTaskStore } from '@/stores/entities'
import { EMPTY_DAY, buildDayItems, type DayItems, type TimedTask } from '../lib/calendarItems'
import { useCalendarStore } from '../store'

/** A single day's items, in one flat list, in the order a person reads a day. */
export type AgendaEntry =
  | { kind: 'allDay'; key: string; occurrence: DayItems['allDay'][number] }
  | { kind: 'event'; key: string; occurrence: DayItems['timed'][number] }
  | { kind: 'task'; key: string; timed: TimedTask }
  | { kind: 'taskAllDay'; key: string; task: DayItems['tasks'][number] }
  | { kind: 'milestone'; key: string; item: DayItems['milestones'][number] }

/**
 * Everything the calendar shows for one date, and the counts for a range.
 *
 * This is the one place a day is turned into a list, so the mini month, the month grid, the year
 * density and the agenda can never disagree about what is on a day: they all ask this.
 */
export function useAgenda(day: Date, hiddenCategoryIds: string[], showTasks: boolean, showMilestones = false): DayItems {
  const events = useEventStore((s) => s.items)
  const tasks = useTaskStore((s) => s.items)
  const projects = useProjectStore((s) => s.items)
  const range = useMemo(
    () => ({ start: startOfDay(day), end: addDays(startOfDay(day), 1) }),
    [day.getTime()],
  )
  return useMemo(
    () => buildDayItems(events, tasks, range, { hiddenCategoryIds, showTasks, showMilestones }, projects).get(toISODate(day)) ?? EMPTY_DAY,
    [events, tasks, projects, range, day, hiddenCategoryIds, showTasks, showMilestones],
  )
}

/** All-day first, then timed items by start, with tasks sharing the clock in the same order. */
export function agendaEntries(items: DayItems): AgendaEntry[] {
  const timed = [
    ...items.timed.map((occurrence) => ({ kind: 'event' as const, key: occurrence.instanceKey, occurrence, minutes: occurrence.start.getHours() * 60 + occurrence.start.getMinutes() })),
    ...items.timedTasks.map((timedTask) => ({ kind: 'task' as const, key: timedTask.task.id, timed: timedTask, minutes: timedTask.minutes })),
  ].sort((a, b) => a.minutes - b.minutes)

  return [
    ...items.allDay.map((occurrence) => ({ kind: 'allDay' as const, key: occurrence.instanceKey, occurrence })),
    ...timed,
    ...items.milestones.map((item) => ({ kind: 'milestone' as const, key: `m-${item.milestone.id}`, item })),
    ...items.tasks.map((task) => ({ kind: 'taskAllDay' as const, key: task.id, task })),
  ]
}

/** How busy a day is: the three steps the year view and the month cells draw. */
export type Density = 0 | 1 | 2

export const densityOf = (count: number): Density => (count === 0 ? 0 : count <= 2 ? 1 : 2)

/** The filters every view shares, read once so nothing can apply a different set. */
export function useCalendarFilters() {
  const hiddenCategoryIds = useCalendarStore((s) => s.hiddenCategoryIds)
  const showTasks = useCalendarStore((s) => s.showTasks)
  const showMilestones = useCalendarStore((s) => s.showMilestones)
  return { hiddenCategoryIds, showTasks, showMilestones }
}

export const describeDay = (day: Date) => fmt(day, 'EEEE, d MMMM yyyy')