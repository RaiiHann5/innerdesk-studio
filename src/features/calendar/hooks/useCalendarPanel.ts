import { useMediaQuery } from '@/lib/useMediaQuery'
import { useUiStore } from '@/stores/ui'
import { COMPACT_WIDTH } from '../lib/range'

/** Where the right panel shows. The three are the same content in three shapes. */
export type PanelMode = 'column' | 'drawer' | 'sheet'

/**
 * One API for the calendar's side panel, so the page never branches on screen size itself.
 *
 * A column on a desktop, a drawer on a tablet, a bottom sheet on a phone: the breakpoint matches
 * `ContextPanel`, so the panel and its container can never disagree about which one they are.
 */
export function useCalendarPanel() {
  const isColumn = useMediaQuery('(min-width: 1280px)')
  const isCompact = useMediaQuery(COMPACT_WIDTH)
  const panelOpen = useUiStore((s) => s.panelOpen)
  const drawerOpen = useUiStore((s) => s.drawerOpen)
  const setPanelOpen = useUiStore((s) => s.setPanelOpen)
  const setDrawerOpen = useUiStore((s) => s.setDrawerOpen)

  const mode: PanelMode = isColumn ? 'column' : isCompact ? 'sheet' : 'drawer'
  const isOpen = mode === 'column' ? panelOpen : drawerOpen
  const setOpen = mode === 'column' ? setPanelOpen : setDrawerOpen

  return { mode, isOpen, setOpen }
}