import { addDays, getISODay, parseISO } from 'date-fns'
import { toISODate } from '@/lib/date'
import type { MoodEntry, MoodFactor } from '@/types/domain'
import { FACTORS } from './levels'

/** Below this many entries the patterns would be guesses, so none are shown. */
export const MIN_ENTRIES = 7
/** A day counts as a good day from this level up. */
const GOOD_LEVEL = 4
/** A weekday needs this many entries before it can be called the best one. */
const MIN_PER_WEEKDAY = 2
/** A factor needs to show up on at least this many good days, out of at least MIN_GOOD_DAYS. */
const MIN_FACTOR_DAYS = 2
const MIN_GOOD_DAYS = 3

export interface WeekComparison {
  thisWeek: number
  lastWeek: number
  /** thisWeek minus lastWeek. */
  diff: number
}

export interface BestWeekday {
  /** 1 is Monday, 7 is Sunday. */
  weekday: number
  average: number
  count: number
}

export interface GoodDayFactor {
  factor: MoodFactor
  /** Good days the factor was present on. */
  count: number
  goodDays: number
}

export interface Insights {
  enough: boolean
  weekComparison: WeekComparison | null
  bestWeekday: BestWeekday | null
  goodDayFactor: GoodDayFactor | null
}

export const average = (values: number[]): number | null =>
  values.length === 0 ? null : values.reduce((sum, v) => sum + v, 0) / values.length

const shift = (date: string, days: number) => toISODate(addDays(parseISO(date), days))

/** The last seven days up to `today` against the seven before them. Null if either week has no entries. */
export function compareWeeks(entries: MoodEntry[], today: string): WeekComparison | null {
  const thisStart = shift(today, -6)
  const lastStart = shift(today, -13)
  const thisWeek = average(entries.filter((e) => e.date >= thisStart && e.date <= today).map((e) => e.level))
  const lastWeek = average(entries.filter((e) => e.date >= lastStart && e.date < thisStart).map((e) => e.level))
  if (thisWeek === null || lastWeek === null) return null
  return { thisWeek, lastWeek, diff: thisWeek - lastWeek }
}

/** The weekday with the highest average level. Ties go to the one with more entries, then the earlier day. */
export function findBestWeekday(entries: MoodEntry[]): BestWeekday | null {
  const byDay = new Map<number, number[]>()
  for (const entry of entries) {
    const weekday = getISODay(parseISO(entry.date))
    byDay.set(weekday, [...(byDay.get(weekday) ?? []), entry.level])
  }
  const candidates: BestWeekday[] = []
  for (const [weekday, levels] of byDay) {
    if (levels.length >= MIN_PER_WEEKDAY) candidates.push({ weekday, average: average(levels) ?? 0, count: levels.length })
  }
  candidates.sort((a, b) => b.average - a.average || b.count - a.count || a.weekday - b.weekday)
  return candidates[0] ?? null
}

/** The factor present on the most good days. Null when there are too few good days or no factor repeats. */
export function findGoodDayFactor(entries: MoodEntry[]): GoodDayFactor | null {
  const good = entries.filter((e) => e.level >= GOOD_LEVEL)
  if (good.length < MIN_GOOD_DAYS) return null
  let best: GoodDayFactor | null = null
  for (const { id } of FACTORS) {
    const count = good.filter((e) => e.factors.includes(id)).length
    if (count >= MIN_FACTOR_DAYS && (best === null || count > best.count)) best = { factor: id, count, goodDays: good.length }
  }
  return best
}

export function computeInsights(entries: MoodEntry[], today: string): Insights {
  if (entries.length < MIN_ENTRIES) return { enough: false, weekComparison: null, bestWeekday: null, goodDayFactor: null }
  return {
    enough: true,
    weekComparison: compareWeeks(entries, today),
    bestWeekday: findBestWeekday(entries),
    goodDayFactor: findGoodDayFactor(entries),
  }
}
