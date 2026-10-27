import { describe, expect, it } from 'vitest'
import type { Habit, HabitLog } from '@/types/domain'
import { ALL_WEEKDAYS, indexLogs } from './habits'
import { STREAK_MILESTONES, milestonesOf, monthGrid, notesOf, totalsOf, weekdayExtremes, weekdayRates, weeklyRates } from './habitInsights'

const TODAY = '2026-10-25' // Sunday

const habit = (fields: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  createdAt: '',
  updatedAt: '',
  name: 'Uji',
  color: 'moss',
  icon: 'star',
  days: ALL_WEEKDAYS,
  target: 1,
  startDate: '2026-09-01',
  order: 1000,
  ...fields,
})
const logs = (dates: string[], value = 1): HabitLog[] => dates.map((date) => ({ id: date, createdAt: '', updatedAt: '', habitId: 'h1', date, value }))

describe('totalsOf', () => {
  it('counts completed due days and sums the amount', () => {
    const h = habit({ target: 4, startDate: '2026-10-20' })
    const index = indexLogs([...logs(['2026-10-20', '2026-10-21'], 4), ...logs(['2026-10-22'], 2)])
    expect(totalsOf(h, index, TODAY)).toEqual({ completedDays: 2, amount: 10, daysSinceStart: 6 })
  })

  it('does not count a day that is not due, even with a log on it', () => {
    const h = habit({ days: [1], startDate: '2026-10-19' }) // Mondays; the 19th is one
    const index = indexLogs(logs(['2026-10-19', '2026-10-20']))
    expect(totalsOf(h, index, TODAY).completedDays).toBe(1)
  })

  it('is zero for a habit that has not started', () => {
    expect(totalsOf(habit({ startDate: '2026-11-01' }), indexLogs([]), TODAY)).toEqual({ completedDays: 0, amount: 0, daysSinceStart: 0 })
  })
})

describe('weeklyRates', () => {
  it('returns the requested number of weeks, oldest first, ending with this one', () => {
    const weeks = weeklyRates(habit(), indexLogs([]), TODAY, 3)
    expect(weeks.map((w) => w.start)).toEqual(['2026-10-05', '2026-10-12', '2026-10-19'])
  })

  it('counts the current week only up to today, and weeks before the start as empty', () => {
    const h = habit({ startDate: '2026-10-14' })
    const index = indexLogs(logs(['2026-10-14', '2026-10-15', '2026-10-19', '2026-10-20']))
    const [before, middle, current] = weeklyRates(h, index, TODAY, 3)
    expect(before.rate).toBeNull() // 5 to 11 Oct: not started
    expect(middle).toMatchObject({ done: 2, scheduled: 5 }) // 14 to 18 Oct
    expect(current).toMatchObject({ done: 2, scheduled: 7 }) // 19 to 25 Oct, Sunday is today
  })
})

describe('weekdayRates and weekdayExtremes', () => {
  // Due Monday, Wednesday and Friday over three full weeks, done only on Mondays and Wednesdays.
  const h = habit({ days: [1, 3, 5], startDate: '2026-10-05' })
  const done = ['2026-10-05', '2026-10-07', '2026-10-12', '2026-10-14', '2026-10-19', '2026-10-21']
  const rates = weekdayRates(h, indexLogs(logs(done)), TODAY)

  it('reports a rate for each due weekday', () => {
    expect(rates.map((r) => [r.weekday, r.done, r.scheduled, r.rate])).toEqual([
      [1, 3, 3, 1],
      [3, 3, 3, 1],
      [5, 0, 3, 0],
    ])
  })

  it('names the easiest and hardest weekday', () => {
    const extremes = weekdayExtremes(rates)
    expect(extremes?.best.weekday).toBe(1) // ties go to the earlier weekday
    expect(extremes?.worst.weekday).toBe(5)
  })

  it('says nothing when the weekdays are alike or there are too few days', () => {
    const alike = weekdayRates(h, indexLogs(logs([...done, '2026-10-09', '2026-10-16', '2026-10-23'])), TODAY)
    expect(weekdayExtremes(alike)).toBeNull()
    const young = weekdayRates(habit({ days: [1, 3], startDate: '2026-10-23' }), indexLogs([]), TODAY)
    expect(weekdayExtremes(young)).toBeNull()
  })
})

describe('milestonesOf', () => {
  it('lists what was reached and what is next, measuring the distance from the current run', () => {
    const status = milestonesOf(20, 12, STREAK_MILESTONES)
    expect(status).toEqual({ reached: [7, 14], next: 30, remaining: 18 })
  })
  it('has no next once everything is reached', () => {
    expect(milestonesOf(400, 400, STREAK_MILESTONES).next).toBeNull()
    expect(milestonesOf(400, 400, STREAK_MILESTONES).remaining).toBeNull()
  })
  it('reaches nothing at zero', () => {
    expect(milestonesOf(0, 0, STREAK_MILESTONES)).toEqual({ reached: [], next: 7, remaining: 7 })
  })
})

describe('monthGrid', () => {
  const rows = monthGrid(habit(), indexLogs(logs(['2026-10-24'])), '2026-10-01', TODAY)

  it('makes whole weeks starting on Monday', () => {
    expect(rows.every((r) => r.length === 7)).toBe(true)
    expect(rows[0][0].date).toBe('2026-09-28') // 1 Oct 2026 is a Thursday
    expect(rows[rows.length - 1][6].date).toBe('2026-11-01')
    expect(rows).toHaveLength(5)
  })

  it('marks which days belong to the month and their state', () => {
    const flat = rows.flat()
    expect(flat.filter((c) => c.inMonth)).toHaveLength(31)
    expect(flat.find((c) => c.date === '2026-10-24')?.state).toBe('done')
    expect(flat.find((c) => c.date === '2026-10-26')?.state).toBe('future')
    expect(flat.find((c) => c.date === '2026-10-25')?.state).toBe('open')
  })
})

describe('notesOf', () => {
  it('keeps only this habit’s entries that have text, newest first', () => {
    const all: HabitLog[] = [
      { id: '1', createdAt: '', updatedAt: '', habitId: 'h1', date: '2026-10-01', value: 1, note: 'lama' },
      { id: '2', createdAt: '', updatedAt: '', habitId: 'h1', date: '2026-10-20', value: 0, note: 'baru' },
      { id: '3', createdAt: '', updatedAt: '', habitId: 'h1', date: '2026-10-10', value: 1 },
      { id: '4', createdAt: '', updatedAt: '', habitId: 'h2', date: '2026-10-22', value: 1, note: 'lain' },
    ]
    expect(notesOf(all, 'h1').map((l) => l.note)).toEqual(['baru', 'lama'])
  })
})
