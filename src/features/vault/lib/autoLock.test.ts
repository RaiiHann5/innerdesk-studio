import { describe, expect, it } from 'vitest'
import { HIDDEN_LOCK_MS, dueLockReason, lockMessage, normalizeIdleMinutes } from './autoLock'

const MIN = 60_000

describe('normalizeIdleMinutes', () => {
  it('accepts only 1, 5, 15 and 30, and has no "never"', () => {
    for (const ok of [1, 5, 15, 30]) expect(normalizeIdleMinutes(ok)).toBe(ok)
    for (const bad of [0, -1, 60, 2, Infinity, NaN, null, undefined, '5', 'never', {}]) expect(normalizeIdleMinutes(bad)).toBe(5)
  })
})

describe('dueLockReason', () => {
  const state = { lastActivityAt: 1_000_000, hiddenSince: null }

  it('locks exactly at the idle limit, not before', () => {
    expect(dueLockReason(state, state.lastActivityAt + 5 * MIN - 1, 5)).toBeNull()
    expect(dueLockReason(state, state.lastActivityAt + 5 * MIN, 5)).toBe('idle')
    expect(dueLockReason(state, state.lastActivityAt + MIN, 1)).toBe('idle')
    expect(dueLockReason(state, state.lastActivityAt + 29 * MIN, 30)).toBeNull()
  })

  it('locks after the tab was hidden for 2 minutes, even when the idle limit is far away', () => {
    const hidden = { lastActivityAt: 1_000_000, hiddenSince: 1_010_000 }
    expect(dueLockReason(hidden, hidden.hiddenSince + HIDDEN_LOCK_MS - 1, 30)).toBeNull()
    expect(dueLockReason(hidden, hidden.hiddenSince + HIDDEN_LOCK_MS, 30)).toBe('hidden')
  })

  it('prefers the hidden reason when both are due', () => {
    expect(dueLockReason({ lastActivityAt: 0, hiddenSince: 10 * MIN }, 40 * MIN, 5)).toBe('hidden')
  })

  it('locks when the clock moved backwards', () => {
    expect(dueLockReason(state, state.lastActivityAt - 1, 30)).toBe('idle')
    expect(dueLockReason({ lastActivityAt: 0, hiddenSince: 500 }, 100, 30)).toBe('hidden')
  })

  it('has a message for every reason', () => {
    expect(lockMessage('idle', 15)).toContain('15 menit')
    for (const reason of ['manual', 'idle', 'hidden', 'external'] as const) expect(lockMessage(reason, 5).length).toBeGreaterThan(0)
  })
})
