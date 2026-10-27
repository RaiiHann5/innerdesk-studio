import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PinRecord } from './pin'

interface LockState {
  enabled: boolean
  pin: PinRecord | null
  /** Lock again when the tab is hidden. */
  lockOnHide: boolean
  /** Memory only, on purpose: a reload locks the journal again. */
  unlocked: boolean
  enable: () => void
  /** Turning the lock off also forgets the PIN. */
  disable: () => void
  setPin: (pin: PinRecord | null) => void
  setLockOnHide: (on: boolean) => void
  lock: () => void
  unlock: () => void
}

/**
 * Screen privacy for the journal. This hides text on the screen; it does not encrypt anything.
 * The journal stays in localStorage exactly as written.
 */
export const useLockStore = create<LockState>()(
  persist(
    (set) => ({
      enabled: false,
      pin: null,
      lockOnHide: false,
      unlocked: false,
      // Whoever switches it on is looking at the page, so this session starts unlocked.
      enable: () => set({ enabled: true, unlocked: true }),
      disable: () => set({ enabled: false, pin: null, lockOnHide: false, unlocked: true }),
      setPin: (pin) => set({ pin }),
      setLockOnHide: (lockOnHide) => set({ lockOnHide }),
      lock: () => set({ unlocked: false }),
      unlock: () => set({ unlocked: true }),
    }),
    {
      name: 'pos:journal-lock',
      partialize: ({ enabled, pin, lockOnHide }) => ({ enabled, pin, lockOnHide }),
    },
  ),
)

export const useIsLocked = () => useLockStore((s) => s.enabled && !s.unlocked)
