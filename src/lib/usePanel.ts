import { useMediaQuery } from './useMediaQuery'
import { useUiStore } from '@/stores/ui'

/** One API for the dashboard context panel: inline column on wide screens, drawer below. */
export function usePanel() {
  const isWide = useMediaQuery('(min-width: 1280px)')
  const panelOpen = useUiStore((s) => s.panelOpen)
  const drawerOpen = useUiStore((s) => s.drawerOpen)
  const setPanelOpen = useUiStore((s) => s.setPanelOpen)
  const setDrawerOpen = useUiStore((s) => s.setDrawerOpen)
  const open = isWide ? panelOpen : drawerOpen
  const setOpen = isWide ? setPanelOpen : setDrawerOpen
  return { isWide, open, setOpen, toggle: () => setOpen(!open) }
}
