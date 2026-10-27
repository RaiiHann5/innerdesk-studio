import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeChoice = 'system' | 'light' | 'dark'

export interface ToastAction {
  label: string
  run: () => void
}

interface UiState {
  theme: ThemeChoice
  sidebarCollapsed: boolean
  panelOpen: boolean
  drawerOpen: boolean
  paletteOpen: boolean
  /** Focus mode: the chrome steps aside so only the timer is left. */
  zenMode: boolean
  toast: { id: number; message: string; action?: ToastAction } | null
  setTheme: (theme: ThemeChoice) => void
  toggleSidebar: () => void
  setPanelOpen: (open: boolean) => void
  setDrawerOpen: (open: boolean) => void
  setPaletteOpen: (open: boolean) => void
  setZenMode: (on: boolean) => void
  showToast: (message: string, action?: ToastAction) => void
  clearToast: () => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'system',
      sidebarCollapsed: false,
      panelOpen: true,
      drawerOpen: false,
      paletteOpen: false,
      zenMode: false,
      toast: null,
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setPanelOpen: (panelOpen) => set({ panelOpen }),
      setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
      setZenMode: (zenMode) => set({ zenMode }),
      showToast: (message, action) => set({ toast: { id: Date.now(), message, action } }),
      clearToast: () => set({ toast: null }),
    }),
    {
      name: 'pos:ui',
      partialize: (s) => ({ theme: s.theme, sidebarCollapsed: s.sidebarCollapsed, panelOpen: s.panelOpen }),
    },
  ),
)
