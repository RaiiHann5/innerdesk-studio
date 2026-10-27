import { Books, Notebook, CalendarBlank, CheckSquare, FolderSimple, Gear, LockKey, NotePencil, Repeat, SquaresFour, Timer, Wallet, type Icon } from '@phosphor-icons/react'

export interface NavItem {
  to: string
  label: string
  /** For tight spots such as the phone's bottom bar. Falls back to `label`. */
  shortLabel?: string
  icon: Icon
}

export interface NavSection {
  label: string
  items: NavItem[]
}

/**
 * The sidebar, grouped by what the person is doing rather than by feature area.
 *
 * `items` is kept flat alongside the sections so the places that only need a list, such as the
 * command palette and the page title, do not have to walk the tree.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: SquaresFour }],
  },
  {
    label: 'Productivity',
    items: [
      { to: '/tasks', label: 'Task', icon: CheckSquare },
      { to: '/projects', label: 'Project', icon: FolderSimple },
      { to: '/calendar', label: 'Kalender', icon: CalendarBlank },
      { to: '/notes', label: 'Catatan', icon: NotePencil },
      { to: '/focus', label: 'Pomodoro', icon: Timer },
    ],
  },
  {
    label: 'Personal',
    items: [
      { to: '/habits', label: 'Kebiasaan', icon: Repeat },
      { to: '/library', label: 'Library', icon: Books },
      { to: '/journal', label: 'Jurnal & Mood', shortLabel: 'Jurnal', icon: Notebook },
      { to: '/finance', label: 'Keuangan', icon: Wallet },
      { to: '/vault', label: 'Vault', icon: LockKey },
    ],
  },
]

export const SETTINGS_ITEM: NavItem = { to: '/settings', label: 'Settings', icon: Gear }

const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items)
export const ALL_NAV_ITEMS: NavItem[] = [...NAV_ITEMS, SETTINGS_ITEM]

/**
 * What the phone's bottom bar shows directly, in order. Seven items do not fit in a row at 390px, so the
 * rest sit behind "Lainnya". Everything not listed here goes there, so a new page is reachable by default.
 */
export const BOTTOM_NAV_PRIMARY = ['/dashboard', '/tasks', '/calendar', '/journal']
