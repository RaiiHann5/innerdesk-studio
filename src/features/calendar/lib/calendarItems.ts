import { addDays, eachDayOfInterval, startOfDay } from 'date-fns'
import { toISODate } from '@/lib/date'
import type { CalendarEvent, Milestone, Project, Task } from '@/types/domain'
import { expandRecurrence, type DateRange, type Occurrence } from './recurrence'

/** A project milestone with a due date, drawn as an all-day chip. It is its own kind of item, never a task. */
export interface MilestoneItem {
  milestone: Milestone
  project: Project
}

export interface DayItems {
  allDay: Occurrence[]
  timed: Occurrence[]
  /** Tasks due that day with no time of day: they sit in the all-day row. */
  tasks: Task[]
  /** Tasks due that day at a specific time: they sit on the hour grid. */
  timedTasks: TimedTask[]
  /** Milestones due that day, from projects that are not archived. */
  milestones: MilestoneItem[]
  /** Everything shown for the day. Mini month dots, month chips, year density and the agenda all agree with this. */
  count: number
}

/** A task that has a time of day, so it can be placed on the grid. */
export interface TimedTask {
  task: Task
  /** Minutes from midnight. */
  minutes: number
}

export interface ItemFilters {
  hiddenCategoryIds: string[]
  showTasks: boolean
  /** Defaults to false when left out, so callers that predate milestones draw exactly what they did. */
  showMilestones?: boolean
}

/** Read-only stand-in for a day with nothing on it. Never write into it. */
export const EMPTY_DAY: DayItems = { allDay: [], timed: [], tasks: [], timedTasks: [], milestones: [], count: 0 }

/** A fresh, writable bucket. Spreading EMPTY_DAY would share its arrays across every day. */
const emptyDay = (): DayItems => ({ allDay: [], timed: [], tasks: [], timedTasks: [], milestones: [], count: 0 })

/** "HH:mm" to minutes, or null when the value is missing or not a time. */
export function taskMinutes(dueTime: string | undefined): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(dueTime ?? '')
  if (!match) return null
  const minutes = Number(match[1]) * 60 + Number(match[2])
  return minutes >= 0 && minutes < 24 * 60 ? minutes : null
}

/** The one place that decides which items land on which day. A multi-day event appears on every day it covers. */
export function buildDayItems(
  events: CalendarEvent[],
  tasks: Task[],
  range: DateRange,
  { hiddenCategoryIds, showTasks, showMilestones = false }: ItemFilters,
  projects: Project[] = [],
): Map<string, DayItems> {
  const days = new Map<string, DayItems>()
  for (const date of eachDayOfInterval({ start: range.start, end: addDays(range.end, -1) })) {
    days.set(toISODate(date), emptyDay())
  }

  const hidden = new Set(hiddenCategoryIds)
  const visible = events.filter((e) => !hidden.has(e.categoryId))
  for (const occurrence of expandRecurrence(visible, range)) {
    // End is exclusive: a timed event ending at midnight does not touch the next day.
    const lastInstant = new Date(Math.max(occurrence.end.getTime() - 1, occurrence.start.getTime()))
    const last = startOfDay(lastInstant)
    for (let date = startOfDay(occurrence.start); date <= last; date = addDays(date, 1)) {
      const bucket = days.get(toISODate(date))
      if (!bucket) continue
      ;(occurrence.event.allDay ? bucket.allDay : bucket.timed).push(occurrence)
      bucket.count += 1
    }
  }

  if (showTasks) {
    for (const task of tasks) {
      if (task.archivedAt) continue
      const bucket = task.dueDate ? days.get(task.dueDate) : undefined
      if (!bucket) continue
      // A task with a time belongs on the hour grid, not in the all-day row.
      const minutes = taskMinutes(task.dueTime)
      if (minutes === null) bucket.tasks.push(task)
      else bucket.timedTasks.push({ task, minutes })
      bucket.count += 1
    }
  }

  if (showMilestones) {
    for (const project of projects) {
      if (project.archivedAt) continue
      for (const milestone of project.milestones) {
        const bucket = milestone.dueDate ? days.get(milestone.dueDate) : undefined
        if (!bucket) continue
        bucket.milestones.push({ milestone, project })
        bucket.count += 1
      }
    }
  }
  return days
}
