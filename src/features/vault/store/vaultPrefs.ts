import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_IDLE_MINUTES, normalizeIdleMinutes, type IdleMinutes } from '../lib/autoLock'

interface VaultPrefsState {
  autoLockMinutes: IdleMinutes
  /** Blur the vault, and hide any revealed secret, while the window does not have focus. Cosmetic: it is not a lock. */
  blurOnBlur: boolean
  setAutoLockMinutes: (minutes: IdleMinutes) => void
  setBlurOnBlur: (on: boolean) => void
}

/**
 * Preferences only: nothing secret. The key, the passwords and the decrypted items never go through
 * a persisted store. A stored value that is not one of the allowed options falls back to the default.
 */
export const useVaultPrefs = create<VaultPrefsState>()(
  persist(
    (set) => ({
      autoLockMinutes: DEFAULT_IDLE_MINUTES,
      blurOnBlur: false,
      setAutoLockMinutes: (minutes) => set({ autoLockMinutes: normalizeIdleMinutes(minutes) }),
      setBlurOnBlur: (on) => set({ blurOnBlur: on === true }),
    }),
    {
      name: 'pos:vault-prefs',
      partialize: (s) => ({ autoLockMinutes: s.autoLockMinutes, blurOnBlur: s.blurOnBlur }),
      merge: (persisted, current) => ({
        ...current,
        autoLockMinutes: normalizeIdleMinutes((persisted as { autoLockMinutes?: unknown } | null)?.autoLockMinutes),
        blurOnBlur: (persisted as { blurOnBlur?: unknown } | null)?.blurOnBlur === true,
      }),
    },
  ),
)
