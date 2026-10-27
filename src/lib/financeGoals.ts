import { monthOf } from '@/lib/financeDates'
import { goalProgress } from '@/lib/financeSelectors'
import type { Goal } from '@/types/domain'

export type GoalPace =
  | { state: 'reached' }
  | { state: 'no-date' }
  /** The target date has passed and the goal is not reached. The copy stays neutral: no pressure. */
  | { state: 'past' }
  | { state: 'plan'; monthsLeft: number; perMonthMinor: number }

const monthIndex = (month: string): number => {
  const [y, m] = month.split('-').map(Number)
  return y * 12 + (m - 1)
}

/** Months from the current month to the target month, never below 1 (a target this month still has this month). */
export function monthsUntil(today: string, targetDate: string): number {
  return Math.max(1, monthIndex(monthOf(targetDate)) - monthIndex(monthOf(today)))
}

/** The amount to set aside each month, rounded up to a whole minor unit so the plan never ends short. */
export function goalPace(goal: Goal, today: string): GoalPace {
  const progress = goalProgress(goal)
  if (progress.reached) return { state: 'reached' }
  if (!goal.targetDate) return { state: 'no-date' }
  if (goal.targetDate < today) return { state: 'past' }
  const monthsLeft = monthsUntil(today, goal.targetDate)
  return { state: 'plan', monthsLeft, perMonthMinor: Math.floor((progress.remainingMinor + monthsLeft - 1) / monthsLeft) }
}
