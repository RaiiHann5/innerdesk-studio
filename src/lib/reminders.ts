import { addDays, addMinutes, parseISO, setHours, startOfDay } from 'date-fns'
import { expandRecurrence } from '@/features/calendar/lib/recurrence'
import { STORAGE_PREFIX } from '@/lib/config'
import { fmt, toISODate } from '@/lib/date'
import { isComplete, isCounted, isScheduled, valueOn, type LogIndex } from '@/lib/habits'
import { readJSON, writeJSON } from '@/lib/storage'
import type { CalendarEvent, Habit, ReminderOffset } from '@/types/domain'

/** One notification that is due. `key` is the same every time the same reminder is computed, which is what lets it fire once. */
export interface DueReminder {
  key: string
  title: string
  body: string
  /** When it was meant to fire. */
  at: number
}

/** An all-day event has no start time, so its reminders are counted from the morning. */
export const ALL_DAY_HOUR = 9
const DAY_MIN = 1440

const eventStart = (event: CalendarEvent, start: Date): Date => (event.allDay ? setHours(startOfDay(start), ALL_DAY_HOUR) : start)

function eventBody(event: CalendarEvent, start: Date, offset: ReminderOffset): string {
  const when = event.allDay
    ? offset === DAY_MIN
      ? 'Besok, seharian'
      : 'Hari ini, seharian'
    : offset === DAY_MIN
      ? `Besok pukul ${fmt(start, 'HH.mm')}`
      : offset === 60
        ? `1 jam lagi, pukul ${fmt(start, 'HH.mm')}`
        : `${offset} menit lagi, pukul ${fmt(start, 'HH.mm')}`
  return event.location ? `${when} · ${event.location}` : when
}

/**
 * Event reminders whose moment falls in [from, to), oldest first. Repeating events are expanded, so every repeat has its own
 * reminders, and a repeat that was removed has none.
 */
export function dueEventReminders(events: readonly CalendarEvent[], from: Date, to: Date): DueReminder[] {
  const withReminders = events.filter((e) => e.reminders.length > 0)
  if (withReminders.length === 0) return []
  // A reminder can be a day ahead of its event, and an all-day event is counted from 09:00, so the search is wider than the window.
  const occurrences = expandRecurrence(withReminders, { start: addDays(from, -1), end: addDays(to, 2) })
  const due: DueReminder[] = []
  for (const { event, start, instanceKey } of occurrences) {
    const effective = eventStart(event, start)
    for (const offset of event.reminders) {
      const at = addMinutes(effective, -offset)
      if (at < from || at >= to) continue
      due.push({ key: `event|${instanceKey}|${offset}`, title: event.title, body: eventBody(event, effective, offset), at: at.getTime() })
    }
  }
  return due.sort((a, b) => a.at - b.at)
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
export const isReminderTime = (value: string): boolean => TIME.test(value)

function habitBody(habit: Habit, value: number): string {
  if (!isCounted(habit)) return 'Belum dicentang hari ini.'
  const unit = habit.unit ? ` ${habit.unit}` : ''
  return value > 0 ? `Baru ${value} dari ${habit.target}${unit} hari ini.` : `Targetmu ${habit.target}${unit} hari ini.`
}

/** Habit reminders in [from, to), oldest first: on a due day, at the set time, only if the habit is not already complete. */
export function dueHabitReminders(habits: readonly Habit[], index: LogIndex, from: Date, to: Date): DueReminder[] {
  const due: DueReminder[] = []
  const last = toISODate(to)
  for (const habit of habits) {
    if (habit.archivedAt || !habit.reminderTime || !isReminderTime(habit.reminderTime)) continue
    for (let date = toISODate(from); date <= last; date = toISODate(addDays(parseISO(date), 1))) {
      if (!isScheduled(habit, date)) continue
      const at = parseISO(`${date}T${habit.reminderTime}:00`)
      if (at < from || at >= to) continue
      const value = valueOn(index, habit.id, date)
      if (isComplete(habit, value)) continue
      due.push({ key: `habit|${habit.id}|${date}`, title: habit.name, body: habitBody(habit, value), at: at.getTime() })
    }
  }
  return due.sort((a, b) => a.at - b.at)
}

/** Reminders that have not fired yet, oldest first. */
export const unfired = (due: readonly DueReminder[], fired: Readonly<Record<string, number>>): DueReminder[] =>
  due.filter((r) => !(r.key in fired)).sort((a, b) => a.at - b.at)

// What has fired is remembered across reloads, so reopening the app does not repeat a reminder from a minute ago.
const FIRED_KEY = STORAGE_PREFIX + 'reminders-fired'
export const FIRED_KEEP_MS = 3 * 24 * 60 * 60 * 1000

export const loadFired = (): Record<string, number> => readJSON<Record<string, number>>(FIRED_KEY) ?? {}

/** Forgets what fired more than three days ago, then stores the rest. A full or missing storage is not worth a failure. */
export function saveFired(fired: Record<string, number>, now: number): Record<string, number> {
  const kept = Object.fromEntries(Object.entries(fired).filter(([, at]) => now - at < FIRED_KEEP_MS))
  try {
    writeJSON(FIRED_KEY, kept)
  } catch {
    // The reminders still fire; at worst one repeats after a reload.
  }
  return kept
}
