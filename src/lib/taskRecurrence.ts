import { parseISO } from 'date-fns'
import { advanceDate } from '@/features/calendar/lib/recurrence'
import { isoDay, toISODate } from '@/lib/date'
import type { NewEntity, Task, TaskRecurrence } from '@/types/domain'

/** Safety stop for a series that fell years behind. Daily for 27 years. */
const MAX_STEPS = 10_000

/**
 * The due date of the next copy. Dates are stepped with the calendar's own rules (advanceDate), so month
 * ends clamp the same way in both places.
 *
 * - The schedule follows the due date, not the day it was ticked off, so finishing a weekly task a day
 *   early does not move the series.
 * - The result is always after the due date and after today. A task finished late skips the missed
 *   dates instead of coming back already overdue.
 * - A task without a due date repeats from today.
 *
 * Each month step is taken from the current due date, so a series on the 31st settles on the 28th once it
 * has passed through February. The calendar avoids this because it counts from the first start.
 */
export function nextDueDate(due: string | undefined, rule: TaskRecurrence, today: string = isoDay(0)): string {
  const interval = Math.max(1, Math.floor(rule.interval) || 1)
  const base = parseISO(due ?? today)
  const floor = due && due > today ? due : today
  for (let step = 1; step <= MAX_STEPS; step++) {
    const candidate = toISODate(advanceDate(base, rule.freq, step * interval))
    if (candidate > floor) return candidate
  }
  return toISODate(advanceDate(base, rule.freq, MAX_STEPS * interval))
}

/** True when this change finishes a recurring task. Reopening a task or editing a finished one does not. */
export const completesRecurring = (before: Pick<Task, 'status' | 'recurrence'>, nextStatus: Task['status']) =>
  !!before.recurrence && before.status !== 'done' && nextStatus === 'done'

/**
 * The task to create when a recurring task is completed, or null when it should not repeat.
 *
 * Carries over title, description, priority, project, tags, estimate, due time and the rule itself.
 * Starts fresh: status todo, subtasks unchecked (same ids), no time log, notes or completion date.
 * Keeps `order`, so the new copy sits where the old one did.
 *
 * Pass `existing` to stop a duplicate: reopening a task and finishing it again must not stack a second
 * copy for the same date.
 */
export function nextOccurrence(task: Task, existing: Task[] = [], today: string = isoDay(0)): NewEntity<Task> | null {
  if (!task.recurrence) return null
  const dueDate = nextDueDate(task.dueDate, task.recurrence, today)

  const duplicate = existing.some(
    (t) =>
      t.id !== task.id &&
      !t.archivedAt &&
      t.status !== 'done' &&
      t.title === task.title &&
      t.projectId === task.projectId &&
      t.dueDate === dueDate,
  )
  if (duplicate) return null

  return {
    title: task.title,
    description: task.description,
    status: 'todo',
    priority: task.priority,
    projectId: task.projectId,
    dueDate,
    dueTime: task.dueTime,
    tags: [...task.tags],
    noteCount: 0,
    timeLog: [],
    focusCount: 0,
    subtasks: task.subtasks.map((s) => ({ ...s, done: false })),
    estimateMinutes: task.estimateMinutes,
    recurrence: { ...task.recurrence },
    order: task.order,
  }
}

const FREQ_UNIT = { daily: 'hari', weekly: 'minggu', monthly: 'bulan' } as const

/** "Setiap hari", "Setiap 2 minggu", for the detail panel and the card tooltip. */
export const recurrenceLabel = (rule: TaskRecurrence): string =>
  rule.interval === 1 ? `Setiap ${FREQ_UNIT[rule.freq]}` : `Setiap ${rule.interval} ${FREQ_UNIT[rule.freq]}`
