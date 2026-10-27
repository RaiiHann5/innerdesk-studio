import { describe, expect, it } from 'vitest'
import type { MoodEntry, MoodFactor, MoodLevel } from '@/types/domain'
import { MIN_ENTRIES, average, compareWeeks, computeInsights, findBestWeekday, findGoodDayFactor } from './insights'

// 2026-10-10 is a Saturday.
const TODAY = '2026-10-10'

let n = 0
const entry = (date: string, level: MoodLevel, factors: MoodFactor[] = []): MoodEntry => ({
  id: `m-${++n}`,
  date,
  level,
  factors,
  createdAt: '2026-10-10T00:00:00.000Z',
  updatedAt: '2026-10-10T00:00:00.000Z',
})

describe('average', () => {
  it('is null for no values and the mean otherwise', () => {
    expect(average([])).toBeNull()
    expect(average([2, 4, 3])).toBe(3)
  })
})

describe('compareWeeks', () => {
  it('compares the last seven days with the seven before', () => {
    const entries = [
      entry('2026-10-10', 4),
      entry('2026-10-04', 2), // first day of this week
      entry('2026-10-03', 5), // last day of last week
      entry('2026-09-27', 3), // first day of last week
    ]
    const result = compareWeeks(entries, TODAY)
    expect(result?.thisWeek).toBe(3)
    expect(result?.lastWeek).toBe(4)
    expect(result?.diff).toBe(-1)
  })

  it('ignores days older than two weeks', () => {
    const entries = [entry('2026-10-10', 4), entry('2026-10-01', 3), entry('2026-09-26', 1)]
    expect(compareWeeks(entries, TODAY)?.lastWeek).toBe(3)
  })

  it('is null when either week is empty', () => {
    expect(compareWeeks([entry('2026-10-10', 4)], TODAY)).toBeNull()
    expect(compareWeeks([entry('2026-10-02', 4)], TODAY)).toBeNull()
  })
})

describe('findBestWeekday', () => {
  it('picks the weekday with the highest average', () => {
    const entries = [
      entry('2026-10-10', 5), // Saturday
      entry('2026-10-03', 4), // Saturday
      entry('2026-10-09', 3), // Friday
      entry('2026-10-02', 3), // Friday
    ]
    expect(findBestWeekday(entries)).toEqual({ weekday: 6, average: 4.5, count: 2 })
  })

  it('does not name a weekday seen only once', () => {
    expect(findBestWeekday([entry('2026-10-10', 5), entry('2026-10-09', 3), entry('2026-10-08', 3)])).toBeNull()
  })

  it('breaks a tie with the weekday that has more entries, then the earlier one', () => {
    const entries = [
      entry('2026-10-05', 4), // Monday
      entry('2026-09-28', 4), // Monday
      entry('2026-10-06', 4), // Tuesday
      entry('2026-09-29', 4), // Tuesday
      entry('2026-09-22', 4), // Tuesday
    ]
    expect(findBestWeekday(entries)?.weekday).toBe(2)
    expect(findBestWeekday(entries.slice(0, 4))?.weekday).toBe(1)
  })
})

describe('findGoodDayFactor', () => {
  it('finds the factor present on the most good days', () => {
    const entries = [
      entry('2026-10-10', 5, ['tidur', 'olahraga']),
      entry('2026-10-09', 4, ['tidur']),
      entry('2026-10-08', 4, ['tidur', 'sosial']),
      entry('2026-10-07', 2, ['kerja', 'kerja']),
    ]
    expect(findGoodDayFactor(entries)).toEqual({ factor: 'tidur', count: 3, goodDays: 3 })
  })

  it('only counts good days, not every day', () => {
    const entries = [
      entry('2026-10-10', 4, ['makan']),
      entry('2026-10-09', 4, ['makan']),
      entry('2026-10-08', 5, []),
      entry('2026-10-07', 1, ['kerja']),
      entry('2026-10-06', 2, ['kerja']),
      entry('2026-10-05', 2, ['kerja']),
    ]
    expect(findGoodDayFactor(entries)?.factor).toBe('makan')
  })

  it('is null with fewer than three good days', () => {
    expect(findGoodDayFactor([entry('2026-10-10', 5, ['tidur']), entry('2026-10-09', 4, ['tidur'])])).toBeNull()
  })

  it('is null when no factor repeats across good days', () => {
    const entries = [entry('2026-10-10', 5, ['tidur']), entry('2026-10-09', 4, ['makan']), entry('2026-10-08', 4, ['sosial'])]
    expect(findGoodDayFactor(entries)).toBeNull()
  })
})

describe('computeInsights', () => {
  const days = (count: number) =>
    Array.from({ length: count }, (_, i) => entry(`2026-10-${String(10 - i).padStart(2, '0')}`, 4, ['tidur']))

  it('says there is not enough data below the minimum, and computes nothing', () => {
    const result = computeInsights(days(MIN_ENTRIES - 1), TODAY)
    expect(result).toEqual({ enough: false, weekComparison: null, bestWeekday: null, goodDayFactor: null })
  })

  it('computes insights at the minimum', () => {
    const result = computeInsights(days(MIN_ENTRIES), TODAY)
    expect(result.enough).toBe(true)
    expect(result.goodDayFactor?.factor).toBe('tidur')
  })
})
