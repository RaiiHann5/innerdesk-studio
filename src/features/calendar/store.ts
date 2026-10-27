import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toISODate } from '@/lib/date'
import type { CalendarView } from './lib/range'

interface CalendarState {
  view: CalendarView
  /** yyyy-MM-dd */
  focusedDate: string
  hiddenCategoryIds: string[]
  showTasks: boolean
  showMilestones: boolean
  setView: (view: CalendarView) => void
  setFocusedDate: (date: Date) => void
  toggleCategory: (id: string) => void
  setShowTasks: (show: boolean) => void
  setShowMilestones: (show: boolean) => void
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      view: 'week',
      focusedDate: toISODate(new Date()),
      hiddenCategoryIds: [],
      showTasks: true,
      showMilestones: true,
      setView: (view) => set({ view }),
      setFocusedDate: (date) => set({ focusedDate: toISODate(date) }),
      toggleCategory: (id) =>
        set((s) => ({
          hiddenCategoryIds: s.hiddenCategoryIds.includes(id)
            ? s.hiddenCategoryIds.filter((c) => c !== id)
            : [...s.hiddenCategoryIds, id],
        })),
      setShowTasks: (showTasks) => set({ showTasks }),
      setShowMilestones: (showMilestones) => set({ showMilestones }),
    }),
    { name: 'pos:calendar' },
  ),
)
