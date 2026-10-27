import { addDays, differenceInCalendarDays, endOfMonth, endOfWeek, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { WEEK_STARTS_ON } from '@/lib/config'
import { toISODate } from '@/lib/date'
import { cellState, isComplete, isScheduled, rateBetween, valueOn, type CellState, type LogIndex, type Rate } from '@/lib/habits'
import type { Habit, HabitLog } from '@/types/domain'

const shift = (date: string, days: number) => toISODate(addDays(parseISO(date), days))

export interface Totals {
  /** Due days that were completed, since the habit started. */
  completedDays: number
  /** Everything counted, summed over every day. For a plain check this is the same as the days done. */
  amount: number
  /** Days from the start to today, counting both. */
  daysSinceStart: number
}

const MAX_DAYS = 3660

export function totalsOf(habit: Habit, index: LogIndex, today: string): Totals {
  let completedDays = 0
  let amount = 0
  let steps = 0
  for (let date = habit.startDate; date <= today && steps < MAX_DAYS; date = shift(date, 1), steps++) {
    const value = valueOn(index, habit.id, date)
    amount += value
    if (isScheduled(habit, date) && isComplete(habit, value)) completedDays++
  }
  return { completedDays, amount, daysSinceStart: Math.max(0, differenceInCalendarDays(parseISO(today), parseISO(habit.startDate)) + 1) }
}

export interface WeekRate extends Rate {
  /** yyyy-MM-dd of the first day of the week. */
  start: string
}

/** The last `weeks` weeks, oldest first, the current one counted only up to today. */
export function weeklyRates(habit: Habit, index: LogIndex, today: string, weeks = 12): WeekRate[] {
  const thisWeek = startOfWeek(parseISO(today), { weekStartsOn: WEEK_STARTS_ON })
  return Array.from({ length: weeks }, (_, i) => {
    const start = toISODate(addDays(thisWeek, (i - (weeks - 1)) * 7))
    return { start, ...rateBetween(habit, index, start, shift(start, 6), today) }
  })
}

export interface WeekdayRate extends Rate {
  /** ISO weekday, 1 is Monday. */
  weekday: number
}

/** For each weekday the habit is due on, how often it was done over the last `window` days. */
export function weekdayRates(habit: Habit, index: LogIndex, today: string, window = 90): WeekdayRate[] {
  const from = shift(today, -(window - 1))
  const tally = new Map<number, { done: number; scheduled: number }>()
  let steps = 0
  for (let date = from < habit.startDate ? habit.startDate : from; date <= today && steps < MAX_DAYS; date = shift(date, 1), steps++) {
    if (!isScheduled(habit, date)) continue
    const weekday = ((parseISO(date).getDay() + 6) % 7) + 1
    const entry = tally.get(weekday) ?? { done: 0, scheduled: 0 }
    entry.scheduled++
    if (isComplete(habit, valueOn(index, habit.id, date))) entry.done++
    tally.set(weekday, entry)
  }
  return [...habit.days]
    .sort((a, b) => a - b)
    .map((weekday) => {
      const { done, scheduled } = tally.get(weekday) ?? { done: 0, scheduled: 0 }
      return { weekday, done, scheduled, rate: scheduled === 0 ? null : done / scheduled }
    })
}

/** Each weekday needs this many due days before it is compared with the others. */
export const MIN_WEEKDAY_DAYS = 3
/** Weekdays closer together than this are the same, as far as anyone can tell. */
export const MIN_WEEKDAY_GAP = 0.15

/** The easiest and the hardest weekday, or null when there are too few days or too little difference to say. */
export function weekdayExtremes(rates: readonly WeekdayRate[]): { best: WeekdayRate; worst: WeekdayRate } | null {
  const usable = rates.filter((r) => r.rate !== null && r.scheduled >= MIN_WEEKDAY_DAYS)
  if (usable.length < 2) return null
  const sorted = [...usable].sort((a, b) => (b.rate as number) - (a.rate as number) || a.weekday - b.weekday)
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]
  return (best.rate as number) - (worst.rate as number) >= MIN_WEEKDAY_GAP ? { best, worst } : null
}

export const STREAK_MILESTONES = [7, 14, 30, 60, 100, 200, 365]
export const TOTAL_MILESTONES = [10, 25, 50, 100, 250, 500, 1000]

export interface MilestoneStatus {
  /** Thresholds already reached, ascending. */
  reached: number[]
  /** The next threshold above the best so far, or null when all are reached. */
  next: number | null
  /** How far the current value is from `next`, or null when there is no next. */
  remaining: number | null
}

/**
 * Which thresholds were reached by `best`, and how far `current` is from the next one.
 * For a streak, best is the longest ever and current the one running now: a streak of 12 after a best of 20 is still working toward 30.
 */
export function milestonesOf(best: number, current: number, thresholds: readonly number[]): MilestoneStatus {
  const reached = thresholds.filter((t) => best >= t)
  const next = thresholds.find((t) => best < t) ?? null
  return { reached, next, remaining: next === null ? null : Math.max(0, next - current) }
}

export interface MonthCell {
  date: string
  inMonth: boolean
  state: CellState
}

/** The weeks of one month as rows of seven, padded with the neighbouring days that fill the first and last row. */
export function monthGrid(habit: Habit, index: LogIndex, month: string, today: string): MonthCell[][] {
  const first = startOfMonth(parseISO(month))
  const gridStart = startOfWeek(first, { weekStartsOn: WEEK_STARTS_ON })
  const gridEnd = endOfWeek(endOfMonth(first), { weekStartsOn: WEEK_STARTS_ON })
  const total = differenceInCalendarDays(gridEnd, gridStart) + 1
  const rows: MonthCell[][] = []
  for (let i = 0; i < total; i += 7) {
    rows.push(
      Array.from({ length: 7 }, (_, j) => {
        const date = toISODate(addDays(gridStart, i + j))
        return { date, inMonth: date.slice(0, 7) === month.slice(0, 7), state: cellState(habit, index, date, today) }
      }),
    )
  }
  return rows
}

/** Journal entries of one habit, newest day first. */
export const notesOf = (logs: readonly HabitLog[], habitId: string): HabitLog[] =>
  logs.filter((l) => l.habitId === habitId && l.note).sort((a, b) => b.date.localeCompare(a.date))
