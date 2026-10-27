import type { Task } from '@/types/domain'
import type { DayItems, MilestoneItem } from './calendarItems'
import { isMultiDay } from './monthLayout'
import type { Occurrence } from './recurrence'

export type DayEntry =
  | { kind: 'event'; key: string; occurrence: Occurrence }
  | { kind: 'task'; key: string; task: Task }
  | { kind: 'milestone'; key: string; item: MilestoneItem }

const event = (occurrence: Occurrence): DayEntry => ({ kind: 'event', key: occurrence.instanceKey, occurrence })
const task = (t: Task): DayEntry => ({ kind: 'task', key: t.id, task: t })
const milestone = (item: MilestoneItem): DayEntry => ({ kind: 'milestone', key: `m-${item.milestone.id}`, item })

/** Everything on a day, in reading order: all-day, then timed by start, then milestones, then tasks. */
export function allEntries(day: DayItems): DayEntry[] {
  return [...day.allDay.map(event), ...day.timed.map(event), ...day.milestones.map(milestone), ...day.tasks.map(task)]
}

/** Same order without multi-day events, which month rows draw as bars. */
export function singleDayEntries(day: DayItems): DayEntry[] {
  return allEntries(day).filter((e) => e.kind !== 'event' || !isMultiDay(e.occurrence))
}
