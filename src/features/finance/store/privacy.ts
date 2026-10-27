import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PrivacyState {
  /** Amounts are blurred on screen. Not encryption: the data is stored exactly as before. */
  hidden: boolean
  toggle: () => void
}

export const usePrivacyStore = create<PrivacyState>()(
  persist((set) => ({ hidden: false, toggle: () => set((s) => ({ hidden: !s.hidden })) }), { name: 'pos:finance-privacy' }),
)
