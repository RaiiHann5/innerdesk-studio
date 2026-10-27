/**
 * Escalating wait after failed unlock attempts.
 *
 * This is a convenience, not a security boundary: anyone who can run script in the page or read localStorage
 * can reset it. The real protection against guessing is the PBKDF2 cost. The counter is stored (it is not
 * secret) so that simply reloading the tab does not clear it.
 */
export const GUARD_KEY = 'pos:vault-guard'
/** Wait after the 1st, 2nd, 3rd ... failure. Failures beyond the end of the list use the last value. */
export const FAILURE_DELAYS_MS = [0, 0, 5_000, 15_000, 30_000, 60_000, 120_000, 300_000] as const

export const delayAfterFailures = (failures: number): number =>
  failures <= 0 ? 0 : FAILURE_DELAYS_MS[Math.min(failures, FAILURE_DELAYS_MS.length) - 1]

interface GuardState {
  failures: number
  lockedUntil: number
}

export interface UnlockGuard {
  /** Milliseconds still to wait, 0 when an attempt is allowed. */
  remainingMs(): number
  failures(): number
  /** Returns the wait that now applies. */
  recordFailure(): number
  recordSuccess(): void
}

export function createUnlockGuard({ now = Date.now, key = GUARD_KEY }: { now?: () => number; key?: string } = {}): UnlockGuard {
  let memory: GuardState = { failures: 0, lockedUntil: 0 }

  const read = (): GuardState => {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return memory
      const parsed = JSON.parse(raw) as Partial<GuardState>
      if (Number.isSafeInteger(parsed.failures) && Number.isFinite(parsed.lockedUntil) && parsed.failures! >= 0) {
        return { failures: parsed.failures!, lockedUntil: parsed.lockedUntil! }
      }
    } catch {
      // Unreadable storage or a mangled value: fall back to what this tab knows.
    }
    return memory
  }

  const write = (next: GuardState) => {
    memory = next
    try {
      if (next.failures === 0) localStorage.removeItem(key)
      else localStorage.setItem(key, JSON.stringify(next))
    } catch {
      // The in-memory copy still applies for this tab.
    }
  }

  return {
    remainingMs: () => {
      const { lockedUntil } = read()
      // A clock moved backwards must not shorten the wait beyond the longest delay.
      return Math.min(Math.max(0, lockedUntil - now()), FAILURE_DELAYS_MS[FAILURE_DELAYS_MS.length - 1])
    },
    failures: () => read().failures,
    recordFailure: () => {
      const failures = read().failures + 1
      const wait = delayAfterFailures(failures)
      write({ failures, lockedUntil: wait === 0 ? 0 : now() + wait })
      return wait
    },
    recordSuccess: () => write({ failures: 0, lockedUntil: 0 }),
  }
}
