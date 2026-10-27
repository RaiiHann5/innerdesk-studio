import { indexLogs } from '@/lib/habits'
import { dueEventReminders, dueHabitReminders, unfired, type DueReminder } from '@/lib/reminders'
import type { CalendarEvent, Habit, HabitLog } from '@/types/domain'

/**
 * How far back a reminder is still worth showing. Opening the app a minute after a meeting's reminder should still
 * tell you; opening it the next morning should not replay yesterday.
 */
export const GRACE_MS = 2 * 60_000

export interface TickInput {
  now: number
  /** When the previous tick ran, or null on the first one. */
  last: number | null
  events: readonly CalendarEvent[]
  habits: readonly Habit[]
  logs: readonly HabitLog[]
  fired: Readonly<Record<string, number>>
}

/** The reminders to show right now: due since the last tick (at most GRACE_MS back), and not shown before. */
export function reminderTick({ now, last, events, habits, logs, fired }: TickInput): DueReminder[] {
  const from = new Date(Math.max(last ?? 0, now - GRACE_MS))
  // `to` is exclusive and a reminder due this very millisecond should not wait for the next tick.
  const to = new Date(now + 1)
  return unfired([...dueEventReminders(events, from, to), ...dueHabitReminders(habits, indexLogs(logs), from, to)], fired)
}
