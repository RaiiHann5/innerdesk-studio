import { useCallback, useEffect, useMemo } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { CommandPalette } from '@/components/command/CommandPalette'
import { BottomNav } from '@/components/layout/BottomNav'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Toast } from '@/components/ui/Toast'
import { FocusRuntime } from '@/features/focus/FocusRuntime'
import { ReminderRuntime } from '@/features/reminders/ReminderRuntime'
import { VaultRuntime } from '@/features/vault/VaultRuntime'
import { APP_NAME } from '@/lib/config'
import { useModHotkey } from '@/lib/hotkeys'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { useTheme } from '@/lib/useTheme'
import { loadAllEntities } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import { ALL_NAV_ITEMS } from './nav'

export function AppShell() {
  useTheme()
  const { pathname } = useLocation()
  const isTablet = useMediaQuery('(max-width: 1023px)')
  const storedCollapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const paletteOpen = useUiStore((s) => s.paletteOpen)
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen)
  // Focus mode takes the whole window: no sidebar, no top bar, no bottom bar.
  const zenMode = useUiStore((s) => s.zenMode) && pathname.startsWith('/focus')

  useEffect(() => {
    void loadAllEntities()
  }, [])

  // The focus runtime owns document.title, so the page title is handed to it rather than set here.
  const baseTitle = useMemo(() => {
    const page = ALL_NAV_ITEMS.find((i) => pathname.startsWith(i.to))
    return page ? `${page.label} · ${APP_NAME}` : APP_NAME
  }, [pathname])

  useModHotkey(
    'k',
    useCallback(() => setPaletteOpen(!paletteOpen), [paletteOpen, setPaletteOpen]),
  )

  if (zenMode) {
    return (
      <div className="h-dvh overflow-hidden bg-bg">
        <FocusRuntime baseTitle={baseTitle} />
        <VaultRuntime />
        <ReminderRuntime />
        <main id="main" tabIndex={-1} className="h-full outline-none">
          <div className="h-full animate-page-in">
            <Outlet />
          </div>
        </main>
        <Toast />
      </div>
    )
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-lift"
      >
        Lompat ke konten
      </a>
      <Sidebar collapsed={storedCollapsed || isTablet} canToggle={!isTablet} onToggle={toggleSidebar} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main id="main" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto pb-[calc(3.5rem+env(safe-area-inset-bottom))] outline-none md:pb-0">
          <div key={pathname.split('/')[1]} className="h-full animate-page-in">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
      <FocusRuntime baseTitle={baseTitle} />
      <VaultRuntime />
        <ReminderRuntime />
      <CommandPalette />
      <Toast />
    </div>
  )
}
