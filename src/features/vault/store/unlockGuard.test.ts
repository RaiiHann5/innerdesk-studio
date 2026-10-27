import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installMemoryStorage } from '@/lib/crypto/testing'
import { FAILURE_DELAYS_MS, GUARD_KEY, createUnlockGuard, delayAfterFailures } from './unlockGuard'

let clock = 1_000_000
let storage: ReturnType<typeof installMemoryStorage>

beforeEach(() => {
  clock = 1_000_000
  storage = installMemoryStorage()
})

describe('delayAfterFailures', () => {
  it('lets the first two failures through, then escalates and caps', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 50].map(delayAfterFailures)).toEqual([0, 0, 0, 5_000, 15_000, 30_000, 60_000, 120_000, 300_000, 300_000])
    for (let i = 1; i < FAILURE_DELAYS_MS.length; i++) expect(FAILURE_DELAYS_MS[i]).toBeGreaterThanOrEqual(FAILURE_DELAYS_MS[i - 1])
  })
})

describe('createUnlockGuard', () => {
  it('waits after the third failure and counts down', () => {
    const guard = createUnlockGuard({ now: () => clock })
    expect(guard.recordFailure()).toBe(0)
    expect(guard.recordFailure()).toBe(0)
    expect(guard.remainingMs()).toBe(0)
    expect(guard.recordFailure()).toBe(5_000)
    expect(guard.remainingMs()).toBe(5_000)
    clock += 3_000
    expect(guard.remainingMs()).toBe(2_000)
    clock += 2_000
    expect(guard.remainingMs()).toBe(0)
    expect(guard.recordFailure()).toBe(15_000)
  })

  it('resets on success', () => {
    const guard = createUnlockGuard({ now: () => clock })
    for (let i = 0; i < 5; i++) guard.recordFailure()
    guard.recordSuccess()
    expect(guard.failures()).toBe(0)
    expect(guard.remainingMs()).toBe(0)
    expect(storage.memory.has(GUARD_KEY)).toBe(false)
  })

  it('survives a reload because the counter is stored, and stores nothing but two numbers', () => {
    const first = createUnlockGuard({ now: () => clock })
    for (let i = 0; i < 4; i++) first.recordFailure()
    expect(JSON.parse(storage.memory.get(GUARD_KEY)!)).toEqual({ failures: 4, lockedUntil: clock + 15_000 })
    const reloaded = createUnlockGuard({ now: () => clock })
    expect(reloaded.failures()).toBe(4)
    expect(reloaded.remainingMs()).toBe(15_000)
  })

  it('does not let a clock moved backwards stretch the wait past the longest delay', () => {
    const guard = createUnlockGuard({ now: () => clock })
    for (let i = 0; i < 4; i++) guard.recordFailure()
    clock -= 10 * 86_400_000
    expect(guard.remainingMs()).toBe(300_000)
  })

  it('ignores a mangled stored value and still works when storage is unavailable', () => {
    storage.memory.set(GUARD_KEY, '{"failures":"x"}')
    const guard = createUnlockGuard({ now: () => clock })
    expect(guard.failures()).toBe(0)
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } })
    const offline = createUnlockGuard({ now: () => clock })
    for (let i = 0; i < 3; i++) offline.recordFailure()
    expect(offline.remainingMs()).toBe(5_000)
  })
})
