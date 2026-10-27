/** Why the vault locked. Shown to the person and announced to screen readers. */
export type LockReason = 'manual' | 'idle' | 'hidden' | 'external'

export const IDLE_MINUTE_OPTIONS = [1, 5, 15, 30] as const
export type IdleMinutes = (typeof IDLE_MINUTE_OPTIONS)[number]
export const DEFAULT_IDLE_MINUTES: IdleMinutes = 5
/** The tab stayed hidden this long. */
export const HIDDEN_LOCK_MS = 2 * 60_000

/** There is no "never": anything that is not one of the options becomes the default. */
export function normalizeIdleMinutes(value: unknown): IdleMinutes {
  return IDLE_MINUTE_OPTIONS.find((option) => option === value) ?? DEFAULT_IDLE_MINUTES
}

export interface AutoLockState {
  /** Last pointer, key or touch activity on the vault page, or the moment the person left it. */
  lastActivityAt: number
  /** When the tab went hidden, or null while it is visible. */
  hiddenSince: number | null
}

/**
 * Pure rule: which reason, if any, says the vault must be locked at `now`.
 * A clock that moved backwards counts as idle, so changing the system time cannot extend a session.
 */
export function dueLockReason(state: AutoLockState, now: number, idleMinutes: IdleMinutes): 'idle' | 'hidden' | null {
  if (state.hiddenSince !== null && now - state.hiddenSince >= HIDDEN_LOCK_MS) return 'hidden'
  if (now < state.lastActivityAt) return 'idle'
  if (state.hiddenSince !== null && now < state.hiddenSince) return 'hidden'
  if (now - state.lastActivityAt >= idleMinutes * 60_000) return 'idle'
  return null
}

export function lockMessage(reason: LockReason, idleMinutes: IdleMinutes): string {
  switch (reason) {
    case 'manual':
      return 'Vault dikunci.'
    case 'idle':
      return `Vault terkunci otomatis setelah ${idleMinutes} menit tanpa aktivitas.`
    case 'hidden':
      return 'Vault terkunci otomatis karena tab tidak terlihat selama 2 menit atau lebih.'
    case 'external':
      return 'Vault terkunci karena berubah di tab lain.'
  }
}
