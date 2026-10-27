import { describe, expect, it } from 'vitest'
import type { Habit, HabitLog, MoodEntry } from '@/types/domain'
import {
  ALL_WEEKDAYS,
  cellState,
  describeDays,
  describeTarget,
  indexLogs,
  isScheduled,
  lastDays,
  moodLink,
  overallRate,
  progressOn,
  rateBetween,
  sortHabits,
  streakOf,
  summarizeDay,
} from './habits'

// 2026-10-25 is a Sunday (ISO weekday 7).
const TODAY = '2026-10-25'

const habit = (fields: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  name: 'Uji',
  color: 'moss',
  icon: 'star',
  days: ALL_WEEKDAYS,
  target: 1,
  startDate: '2026-09-01',
  order: 1000,
  ...fields,
})

const logs = (habitId: string, dates: string[], value = 1): HabitLog[] =>
  dates.map((date) => ({ id: `${habitId}-${date}`, createdAt: '', updatedAt: '', habitId, date, value }))

describe('isScheduled', () => {
  it('follows the weekdays and ignores days before the start', () => {
    const h = habit({ days: [1, 3], startDate: '2026-10-05' })
    expect(isScheduled(h, '2026-10-05')).toBe(true) // Monday, start day
    expect(isScheduled(h, '2026-10-06')).toBe(false) // Tuesday
    expect(isScheduled(h, '2026-10-07')).toBe(true) // Wednesday
    expect(isScheduled(h, '2026-09-30')).toBe(false) // Wednesday, before the start
  })
})

describe('describeDays and describeTarget', () => {
  it('names common patterns and lists the rest', () => {
    expect(describeDays(ALL_WEEKDAYS)).toBe('Setiap hari')
    expect(describeDays([5, 4, 3, 2, 1])).toBe('Hari kerja')
    expect(describeDays([7, 6])).toBe('Akhir pekan')
    expect(describeDays([3])).toBe('Setiap Rabu')
    expect(describeDays([5, 1, 3])).toBe('Sen, Rab, Jum')
  })
  it('says what counts as done', () => {
    expect(describeTarget({ target: 1 })).toBe('Sekali per hari')
    expect(describeTarget({ target: 8, unit: 'gelas' })).toBe('8 gelas per hari')
    expect(describeTarget({ target: 3 })).toBe('3 per hari')
  })
})

describe('streakOf', () => {
  it('counts consecutive done days up to today', () => {
    const h = habit()
    const index = indexLogs(logs('h1', ['2026-10-23', '2026-10-24', '2026-10-25']))
    expect(streakOf(h, index, TODAY)).toEqual({ current: 3, best: 3 })
  })

  it('keeps the run alive while today is still open', () => {
    const h = habit()
    const index = indexLogs(logs('h1', ['2026-10-22', '2026-10-23', '2026-10-24']))
    expect(streakOf(h, index, TODAY).current).toBe(3)
  })

  it('ends the run when a past due day was missed', () => {
    const h = habit()
    const index = indexLogs(logs('h1', ['2026-10-22', '2026-10-24', '2026-10-25']))
    expect(streakOf(h, index, TODAY)).toEqual({ current: 2, best: 2 })
  })

  it('does not let days the habit is not due on break the run', () => {
    // Due Monday and Wednesday only. Tuesday and the days between are skipped, not missed.
    const h = habit({ days: [1, 3], startDate: '2026-10-01' })
    const index = indexLogs(logs('h1', ['2026-10-05', '2026-10-07', '2026-10-12', '2026-10-14', '2026-10-19', '2026-10-21']))
    expect(streakOf(h, index, TODAY)).toEqual({ current: 6, best: 6 })
  })

  it('reports the best run even when it is over', () => {
    const h = habit({ startDate: '2026-10-01' })
    const index = indexLogs(logs('h1', ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-24']))
    expect(streakOf(h, index, TODAY)).toEqual({ current: 1, best: 4 })
  })

  it('needs the full target on a counted habit', () => {
    const h = habit({ target: 8, unit: 'gelas' })
    const index = indexLogs([...logs('h1', ['2026-10-23'], 8), ...logs('h1', ['2026-10-24'], 5)])
    expect(streakOf(h, index, TODAY).current).toBe(0)
  })

  it('is zero for a habit that has not started', () => {
    const h = habit({ startDate: '2026-11-01' })
    expect(streakOf(h, indexLogs([]), TODAY)).toEqual({ current: 0, best: 0 })
  })
})

describe('rateBetween', () => {
  it('divides done by due days and skips days after today', () => {
    const h = habit({ startDate: '2026-10-01' })
    const index = indexLogs(logs('h1', ['2026-10-20', '2026-10-21', '2026-10-22']))
    // 20 to 25 is six due days, three of them done.
    expect(rateBetween(h, index, '2026-10-20', '2026-10-31', TODAY)).toEqual({ done: 3, scheduled: 6, rate: 0.5 })
  })

  it('does not count days before the habit started', () => {
    const h = habit({ startDate: '2026-10-24' })
    const result = rateBetween(h, indexLogs([]), '2026-10-01', TODAY, TODAY)
    expect(result.scheduled).toBe(2)
  })

  it('is null when nothing was due', () => {
    const h = habit({ days: [1], startDate: '2026-10-20' })
    expect(rateBetween(h, indexLogs([]), '2026-10-21', '2026-10-25', TODAY).rate).toBeNull()
  })
})

describe('overallRate', () => {
  it('pools the due days of every habit', () => {
    const a = habit({ id: 'a', startDate: '2026-10-24' })
    const b = habit({ id: 'b', startDate: '2026-10-24' })
    const index = indexLogs([...logs('a', ['2026-10-24', TODAY]), ...logs('b', ['2026-10-24'])])
    expect(overallRate([a, b], index, '2026-10-20', TODAY, TODAY)).toEqual({ done: 3, scheduled: 4, rate: 0.75 })
  })
  it('is null with no habits', () => {
    expect(overallRate([], indexLogs([]), '2026-10-20', TODAY, TODAY).rate).toBeNull()
  })
})

describe('summarizeDay and progressOn', () => {
  it('counts only the habits due that day', () => {
    const daily = habit({ id: 'a' })
    const mondays = habit({ id: 'b', days: [1] })
    const counted = habit({ id: 'c', target: 4 })
    const index = indexLogs([...logs('a', [TODAY]), ...logs('c', [TODAY], 2)])
    expect(summarizeDay([daily, mondays, counted], index, TODAY)).toEqual({ done: 1, total: 2 })
    expect(progressOn(counted, index, TODAY)).toBe(0.5)
    expect(progressOn(counted, indexLogs(logs('c', [TODAY], 9)), TODAY)).toBe(1)
  })
})

describe('cellState', () => {
  const h = habit({ days: [1, 2, 3, 4, 5], target: 4, startDate: '2026-10-01' })
  const index = indexLogs([...logs('h1', ['2026-10-22'], 4), ...logs('h1', ['2026-10-23'], 1)])

  it('tells apart done, partial, missed, off and future', () => {
    expect(cellState(h, index, '2026-10-22', TODAY)).toBe('done')
    expect(cellState(h, index, '2026-10-23', TODAY)).toBe('partial')
    expect(cellState(h, index, '2026-10-21', TODAY)).toBe('missed')
    expect(cellState(h, index, '2026-10-24', TODAY)).toBe('off') // Saturday
    expect(cellState(h, index, '2026-10-26', TODAY)).toBe('future')
    expect(cellState(h, index, '2026-09-30', TODAY)).toBe('off') // before the start
  })

  it('calls today open rather than missed', () => {
    expect(cellState(habit(), indexLogs([]), TODAY, TODAY)).toBe('open')
  })
})

describe('lastDays', () => {
  it('ends at today, oldest first', () => {
    expect(lastDays(TODAY, 3)).toEqual(['2026-10-23', '2026-10-24', '2026-10-25'])
  })
})

describe('moodLink', () => {
  const mood = (date: string, level: MoodEntry['level']): MoodEntry => ({ id: date, createdAt: '', updatedAt: '', date, level, factors: [] })
  const h = habit({ startDate: '2026-10-01' })

  it('compares mood on done days with due days that were not done', () => {
    const doneDays = ['2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06']
    const skipped = ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13']
    const moods = [...doneDays.map((d) => mood(d, 4)), ...skipped.map((d) => mood(d, 2))]
    const result = moodLink(h, indexLogs(logs('h1', doneDays)), moods, TODAY)
    expect(result).not.toBeNull()
    expect(result?.withHabit).toBe(4)
    expect(result?.withoutHabit).toBe(2)
    expect(result?.diff).toBe(2)
  })

  it('stays quiet with too few days on either side', () => {
    const moods = [mood('2026-10-02', 5), mood('2026-10-10', 1)]
    expect(moodLink(h, indexLogs(logs('h1', ['2026-10-02'])), moods, TODAY)).toBeNull()
  })

  it('stays quiet when the difference is within noise', () => {
    const doneDays = ['2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']
    const skipped = ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13']
    const moods = [...doneDays.map((d) => mood(d, 3)), ...skipped.map((d) => mood(d, 3))]
    expect(moodLink(h, indexLogs(logs('h1', doneDays)), moods, TODAY)).toBeNull()
  })

  it('does not treat an open today as a skipped day', () => {
    const doneDays = ['2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']
    const moods = [...doneDays.map((d) => mood(d, 5)), mood(TODAY, 1)]
    expect(moodLink(h, indexLogs(logs('h1', doneDays)), moods, TODAY)).toBeNull()
  })
})

describe('sortHabits', () => {
  it('orders by position, then creation time, then id', () => {
    const a = habit({ id: 'a', order: 2000 })
    const b = habit({ id: 'b', order: 1000, createdAt: '2026-02-01T00:00:00.000Z' })
    const c = habit({ id: 'c', order: 1000, createdAt: '2026-01-01T00:00:00.000Z' })
    expect(sortHabits([a, b, c]).map((h) => h.id)).toEqual(['c', 'b', 'a'])
  })
})
