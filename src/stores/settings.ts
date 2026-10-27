import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_CITY, DEFAULT_USER_NAME } from '@/lib/config'
import { DEFAULT_VIEW_PREFS, type DocFont, type DocSize, type DocSpacing } from '@/features/notes/lib/viewPrefs'
import type { City } from '@/types/domain'

interface SettingsState {
  userName: string
  city: City
  /** Days whose writing prompt the person closed, newest last. Capped so it cannot grow forever. */
  dismissedPrompts: string[]
  /** How every note's paper looks. Global, not per note. */
  noteFont: DocFont
  noteSize: DocSize
  noteSpacing: DocSpacing
  /** Whether the "Tampilan" panel is open beside the paper on wide screens. */
  notePanelOpen: boolean
  setNoteFont: (font: DocFont) => void
  setNoteSize: (size: DocSize) => void
  setNoteSpacing: (spacing: DocSpacing) => void
  setNotePanelOpen: (open: boolean) => void
  setUserName: (name: string) => void
  setCity: (city: City) => void
  dismissPrompt: (date: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      userName: DEFAULT_USER_NAME,
      city: DEFAULT_CITY,
      dismissedPrompts: [],
      noteFont: DEFAULT_VIEW_PREFS.font,
      noteSize: DEFAULT_VIEW_PREFS.size,
      noteSpacing: DEFAULT_VIEW_PREFS.spacing,
      notePanelOpen: true,
      setNoteFont: (noteFont) => set({ noteFont }),
      setNoteSize: (noteSize) => set({ noteSize }),
      setNoteSpacing: (noteSpacing) => set({ noteSpacing }),
      setNotePanelOpen: (notePanelOpen) => set({ notePanelOpen }),
      setUserName: (userName) => set({ userName }),
      setCity: (city) => set({ city }),
      dismissPrompt: (date) =>
        set((s) => (s.dismissedPrompts.includes(date) ? s : { dismissedPrompts: [...s.dismissedPrompts, date].slice(-90) })),
    }),
    { name: 'pos:settings' },
  ),
)
