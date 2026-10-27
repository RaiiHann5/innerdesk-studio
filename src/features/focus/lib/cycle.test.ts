import { describe, expect, it } from 'vitest'
import { cycleProgress, hasElapsed, nextStep } from './cycle'

describe('nextStep', () => {
  it('gives a short break after an ordinary focus block', () => {
    expect(nextStep('focus', 0, 4)).toEqual({ mode: 'short', cycle: 1 })
    expect(nextStep('focus', 1, 4)).toEqual({ mode: 'short', cycle: 2 })
    expect(nextStep('focus', 2, 4)).toEqual({ mode: 'short', cycle: 3 })
  })

  it('gives a long break on the fourth focus block', () => {
    expect(nextStep('focus', 3, 4)).toEqual({ mode: 'long', cycle: 4 })
  })

  it('repeats every longEvery blocks', () => {
    expect(nextStep('focus', 7, 4)).toEqual({ mode: 'long', cycle: 8 })
    expect(nextStep('focus', 2, 3)).toEqual({ mode: 'long', cycle: 3 })
    expect(nextStep('focus', 1, 2)).toEqual({ mode: 'long', cycle: 2 })
  })

  it('always returns to focus after a break, without changing the cycle', () => {
    expect(nextStep('short', 1, 4)).toEqual({ mode: 'focus', cycle: 1 })
    expect(nextStep('long', 4, 4)).toEqual({ mode: 'focus', cycle: 4 })
  })

  it('treats a zero interval as one, so every block ends in a long break rather than dividing by zero', () => {
    expect(() => nextStep('focus', 1, 0)).not.toThrow()
    expect(nextStep('focus', 1, 0)).toEqual({ mode: 'long', cycle: 2 })
  })
})

describe('cycleProgress', () => {
  it('counts the blocks done in this cycle', () => {
    expect(cycleProgress(0, 4)).toEqual({ done: 0, total: 4 })
    expect(cycleProgress(1, 4)).toEqual({ done: 1, total: 4 })
    expect(cycleProgress(4, 4)).toEqual({ done: 0, total: 4 })
  })

  it('treats a zero interval as one', () => {
    expect(cycleProgress(2, 0)).toEqual({ done: 0, total: 1 })
  })
})

describe('hasElapsed', () => {
  it('knows when a block is over', () => {
    expect(hasElapsed(1000, 999)).toBe(false)
    expect(hasElapsed(1000, 1000)).toBe(true)
    expect(hasElapsed(1000, 1001)).toBe(true)
  })

  it('is never elapsed when nothing is scheduled', () => {
    expect(hasElapsed(null, 999_999)).toBe(false)
  })
})
