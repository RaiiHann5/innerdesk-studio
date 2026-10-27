import type { FocusMode } from '@/types/domain'

/**
 * Where the cycle is: which mode comes after this one, and how many focus sessions have run.
 *
 * `cycle` counts focus sessions since the last long break, so it decides the next break's length.
 * A long break replaces the short one when the cycle has reached `longEvery`.
 */

export interface CycleStep {
  mode: FocusMode
  /** Focus sessions completed since the last long break. */
  cycle: number
}

/** The mode that follows, given how many focus sessions have run. */
export function nextStep(current: FocusMode, cycle: number, longEvery: number): CycleStep {
  if (current === 'focus') {
    const nextCycle = cycle + 1
    return { mode: nextCycle % Math.max(1, longEvery) === 0 ? 'long' : 'short', cycle: nextCycle }
  }
  return { mode: 'focus', cycle }
}

/** Completed focus sessions in the current cycle, and how many make a long break. */
export const cycleProgress = (cycle: number, longEvery: number) => ({
  done: cycle % Math.max(1, longEvery),
  total: Math.max(1, longEvery),
})

/** True when the block should have ended already, which is how a reload catches up. */
export const hasElapsed = (endsAt: number | null, now: number): boolean => endsAt !== null && now >= endsAt
