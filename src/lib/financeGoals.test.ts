import { describe, expect, it } from 'vitest'
import { goalPace, monthsUntil } from './financeGoals'
import { makeGoal } from './financeTesting'

describe('monthsUntil', () => {
  it('counts calendar months and never goes below one', () => {
    expect(monthsUntil('2026-10-15', '2026-10-31')).toBe(1)
    expect(monthsUntil('2026-10-15', '2026-11-01')).toBe(1)
    expect(monthsUntil('2026-10-15', '2027-01-10')).toBe(3)
  })
})

describe('goalPace', () => {
  const today = '2026-10-15'
  it('divides what is left over the months left, rounded up', () => {
    const goal = makeGoal({ targetMinor: 1_000_000, targetDate: '2027-01-10', contributions: [{ id: 'a', date: '2026-10-01', amountMinor: 100_000 }] })
    expect(goalPace(goal, today)).toEqual({ state: 'plan', monthsLeft: 3, perMonthMinor: 300_000 })
    expect(goalPace(makeGoal({ targetMinor: 1_000_000, targetDate: '2027-01-10' }), today)).toMatchObject({ perMonthMinor: 333_334 })
  })
  it('has states for no date, a passed date and a reached goal', () => {
    expect(goalPace(makeGoal({ targetDate: undefined }), today)).toEqual({ state: 'no-date' })
    expect(goalPace(makeGoal({ targetDate: '2026-09-01' }), today)).toEqual({ state: 'past' })
    expect(goalPace(makeGoal({ targetMinor: 100, contributions: [{ id: 'a', date: today, amountMinor: 100 }] }), today)).toEqual({ state: 'reached' })
  })
})
