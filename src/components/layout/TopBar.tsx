import { useLocation } from 'react-router-dom'
import { LockKeyOpen, MagnifyingGlass, Moon, SidebarSimple, Sun } from '@phosphor-icons/react'
import { ALL_NAV_ITEMS } from '@/app/nav'
import { MiniTimer } from '@/features/focus/MiniTimer'
import { useVaultStore } from '@/features/vault/store/vaultStore'
import { IconButton } from '@/components/ui/IconButton'
import { modKey } from '@/lib/hotkeys'
import { usePanel } from '@/lib/usePanel'
import { useTheme } from '@/lib/useTheme'
import { useUiStore } from '@/stores/ui'
import { HelpPopover } from './HelpPopover'
import { NotificationsPopover } from './NotificationsPopover'

export function TopBar() {
  const { pathname } = useLocation()
  const { resolved, toggle } = useTheme()
  const panel = usePanel()
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen)
  const vaultUnlocked = useVaultStore((s) => s.status === 'unlocked')
  const lockVault = useVaultStore((s) => s.lock)
  const current = ALL_NAV_ITEMS.find((i) => pathname.startsWith(i.to))
  const hasPanel = pathname.startsWith('/dashboard') || pathname.startsWith('/calendar')

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-bg px-4 md:px-6">
      <h2 className="mr-auto font-display text-md font-bold tracking-tight">{current?.label}</h2>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        aria-label={`Cari atau buat task ${modKey} K`}
        aria-keyshortcuts={modKey === 'Ctrl' ? 'Control+K' : 'Meta+K'}
        className="flex h-8 items-center gap-2 rounded-control border bg-surface px-2.5 text-sm text-muted transition-colors duration-fast hover:text-ink md:w-64"
      >
        <MagnifyingGlass aria-hidden />
        <span className="hidden flex-1 text-left md:inline">Cari atau buat task</span>
        {/* The space is real text, so the visible words read "Cari atau buat task Ctrl K" and match the name above. */}
        {' '}
        <kbd className="hidden rounded-control bg-sunken px-1.5 text-xs font-medium md:inline">{modKey} K</kbd>
      </button>

      <MiniTimer />
      {vaultUnlocked && <IconButton icon={LockKeyOpen} label="Kunci vault sekarang (Shift L)" onClick={() => lockVault('manual')} />}
      <NotificationsPopover />
      <IconButton
        icon={resolved === 'dark' ? Sun : Moon}
        label={resolved === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
        onClick={toggle}
      />
      <HelpPopover />
      {hasPanel && (
        <IconButton
          icon={SidebarSimple}
          label={panel.open ? 'Tutup panel samping' : 'Buka panel samping'}
          aria-expanded={panel.open}
          onClick={panel.toggle}
          className="-scale-x-100"
        />
      )}
    </header>
  )
}
