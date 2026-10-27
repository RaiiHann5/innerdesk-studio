import { addDays, getISODay, parseISO } from 'date-fns'
import { toISODate } from '@/lib/date'
import type { Habit, HabitLog, MoodEntry } from '@/types/domain'

/** One value per (habit, day). Built once per render from the logs, then read by every function below. */
export type LogIndex = ReadonlyMap<string, number>

const keyOf = (habitId: string, date: string) => `${habitId}|${date}`

export function indexLogs(logs: readonly HabitLog[]): LogIndex {
  const index = new Map<string, number>()
  for (const log of logs) index.set(keyOf(log.habitId, log.date), log.value)
  return index
}

export const valueOn = (index: LogIndex, habitId: string, date: string): number => index.get(keyOf(habitId, date)) ?? 0

const shift = (date: string, days: number) => toISODate(addDays(parseISO(date), days))

export const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]
export const WEEKDAY_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const WEEKDAY_LONG = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

export const isCounted = (habit: Pick<Habit, 'target'>): boolean => habit.target > 1

/** Whether `value` is enough to call the day done. */
export const isComplete = (habit: Pick<Habit, 'target'>, value: number): boolean => value >= habit.target

/** Due on that day: the weekday is one of the habit's days, and the habit had already started. */
export function isScheduled(habit: Pick<Habit, 'days' | 'startDate'>, date: string): boolean {
  return date >= habit.startDate && habit.days.includes(getISODay(parseISO(date)))
}

/** The weekday picker's answer, said in words: "Setiap hari", "Hari kerja", "Sen, Rab, Jum". */
export function describeDays(days: readonly number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b)
  if (sorted.length === 7) return 'Setiap hari'
  if (sorted.join() === '1,2,3,4,5') return 'Hari kerja'
  if (sorted.join() === '6,7') return 'Akhir pekan'
  if (sorted.length === 1) return `Setiap ${WEEKDAY_LONG[sorted[0] - 1]}`
  return sorted.map((d) => WEEKDAY_SHORT[d - 1]).join(', ')
}

export const describeTarget = (habit: Pick<Habit, 'target' | 'unit'>): string =>
  isCounted(habit) ? `${habit.target}${habit.unit ? ` ${habit.unit}` : ''} per hari` : 'Sekali per hari'

/** How much of the habit is done on `date`, as a share from 0 to 1. A day past the target still reads 1. */
export const progressOn = (habit: Habit, index: LogIndex, date: string): number =>
  Math.min(1, valueOn(index, habit.id, date) / habit.target)

export interface DaySummary {
  done: number
  total: number
}

/** Of the habits due on `date`, how many are complete. Habits not due that day are left out of both numbers. */
export function summarizeDay(habits: readonly Habit[], index: LogIndex, date: string): DaySummary {
  let done = 0
  let total = 0
  for (const habit of habits) {
    if (!isScheduled(habit, date)) continue
    total++
    if (isComplete(habit, valueOn(index, habit.id, date))) done++
  }
  return { done, total }
}

/** Safety stop for the day-by-day walks: ten years is far more history than anyone logs. */
const MAX_DAYS = 3660

export interface Streak {
  /** Consecutive due days done, up to today. Days the habit is not due on neither add to it nor break it. */
  current: number
  best: number
}

/**
 * Streaks. A due day that was missed ends a run. Today does not: while today is still open the run so far
 * stands, and it only ends once the day has passed without being done.
 */
export function streakOf(habit: Habit, index: LogIndex, today: string): Streak {
  const start = habit.startDate
  let best = 0
  let run = 0
  let steps = 0
  for (let date = start; date <= today && steps < MAX_DAYS; date = shift(date, 1), steps++) {
    if (!isScheduled(habit, date)) continue
    if (isComplete(habit, valueOn(index, habit.id, date))) {
      run++
      if (run > best) best = run
    } else if (date !== today) {
      run = 0
    }
  }
  // `run` now holds the current streak: today being open leaves it as it was, today being done has already added to it.
  return { current: run, best }
}

export interface Rate {
  done: number
  scheduled: number
  /** 0 to 1, or null when no day was due in the range. */
  rate: number | null
}

/** Share of due days that were completed, between two dates inclusive. Days after `today` are not counted. */
export function rateBetween(habit: Habit, index: LogIndex, from: string, to: string, today: string): Rate {
  const last = to < today ? to : today
  let done = 0
  let scheduled = 0
  let steps = 0
  for (let date = from < habit.startDate ? habit.startDate : from; date <= last && steps < MAX_DAYS; date = shift(date, 1), steps++) {
    if (!isScheduled(habit, date)) continue
    scheduled++
    if (isComplete(habit, valueOn(index, habit.id, date))) done++
  }
  return { done, scheduled, rate: scheduled === 0 ? null : done / scheduled }
}

/** The same share across several habits at once: every due day of every habit counts once. */
export function overallRate(habits: readonly Habit[], index: LogIndex, from: string, to: string, today: string): Rate {
  let done = 0
  let scheduled = 0
  for (const habit of habits) {
    const r = rateBetween(habit, index, from, to, today)
    done += r.done
    scheduled += r.scheduled
  }
  return { done, scheduled, rate: scheduled === 0 ? null : done / scheduled }
}

/** The last `count` days ending at `today`, oldest first. */
export function lastDays(today: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shift(today, i - (count - 1)))
}

export type CellState = 'done' | 'partial' | 'missed' | 'off' | 'future' | 'open'

/** What one day looks like for one habit. `open` is today while it is still not done: not a miss yet. */
export function cellState(habit: Habit, index: LogIndex, date: string, today: string): CellState {
  if (date > today) return 'future'
  if (!isScheduled(habit, date)) return 'off'
  const value = valueOn(index, habit.id, date)
  if (isComplete(habit, value)) return 'done'
  if (value > 0) return 'partial'
  return date === today ? 'open' : 'missed'
}

export interface MoodLink {
  /** Average mood on days the habit was done, and on due days it was not. */
  withHabit: number
  withoutHabit: number
  daysWith: number
  daysWithout: number
  /** withHabit minus withoutHabit. */
  diff: number
}

/** Each side needs this many days with a mood before a difference is worth showing. */
export const MIN_MOOD_DAYS = 4
/** A difference smaller than this is noise on a five-point scale. */
export const MIN_MOOD_DIFF = 0.3

/**
 * Whether the person's mood differs between days they did the habit and due days they did not, over the last
 * `window` days. Null when either side has too few days with a mood, or the difference is too small to mean anything.
 * It is a pattern in the person's own notes, not a cause.
 */
export function moodLink(habit: Habit, index: LogIndex, moods: readonly MoodEntry[], today: string, window = 90): MoodLink | null {
  const from = shift(today, -(window - 1))
  const withHabit: number[] = []
  const withoutHabit: number[] = []
  for (const mood of moods) {
    if (mood.date < from || mood.date > today || !isScheduled(habit, mood.date)) continue
    // Today is still open, so a mood logged today says nothing about whether the habit was skipped.
    const done = isComplete(habit, valueOn(index, habit.id, mood.date))
    if (done) withHabit.push(mood.level)
    else if (mood.date !== today) withoutHabit.push(mood.level)
  }
  if (withHabit.length < MIN_MOOD_DAYS || withoutHabit.length < MIN_MOOD_DAYS) return null
  const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length
  const a = mean(withHabit)
  const b = mean(withoutHabit)
  if (Math.abs(a - b) < MIN_MOOD_DIFF) return null
  return { withHabit: a, withoutHabit: b, daysWith: withHabit.length, daysWithout: withoutHabit.length, diff: a - b }
}

/** Habits in the order the person arranged them, ties broken by creation time then id. */
export function sortHabits<T extends Habit>(habits: readonly T[]): T[] {
  return [...habits].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
}

/** Where a new habit goes so it lands at the end of the list. */
export const appendHabitOrder = (habits: readonly Habit[]): number => habits.reduce((max, h) => Math.max(max, h.order), 0) + 1000
