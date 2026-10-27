import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { DotsThree } from '@phosphor-icons/react'
import { ALL_NAV_ITEMS, BOTTOM_NAV_PRIMARY } from '@/app/nav'
import { cn } from '@/lib/cn'
import { SheetPanel } from './SheetPanel'

const PRIMARY = BOTTOM_NAV_PRIMARY.flatMap((to) => ALL_NAV_ITEMS.filter((item) => item.to === to))
const MORE = ALL_NAV_ITEMS.filter((item) => !BOTTOM_NAV_PRIMARY.includes(item.to))

const slot = 'flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium'

export function BottomNav() {
  const { pathname } = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreActive = MORE.some((item) => pathname.startsWith(item.to))

  useEffect(() => setMoreOpen(false), [pathname])

  return (
    <>
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {PRIMARY.map(({ to, label, shortLabel, icon: IconComponent }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn(slot, isActive ? 'text-ink' : 'text-muted')}>
            {({ isActive }) => (
              <>
                <IconComponent size={20} weight={isActive ? 'fill' : 'regular'} aria-hidden />
                <span>{shortLabel ?? label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(true)}
          className={cn(slot, moreActive ? 'text-ink' : 'text-muted')}
        >
          <DotsThree size={20} weight={moreActive ? 'fill' : 'regular'} aria-hidden />
          <span>Lainnya</span>
        </button>
      </nav>

      <SheetPanel open={moreOpen} onClose={() => setMoreOpen(false)} label="Menu lainnya" sheet>
        <ul className="space-y-1 pb-[env(safe-area-inset-bottom)]">
          {MORE.map(({ to, label, icon: IconComponent }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex h-11 items-center gap-3 rounded-control px-3 text-base font-medium',
                    isActive ? 'bg-accent-soft text-accent-text' : 'text-ink hover:bg-sunken',
                  )
                }
              >
                <IconComponent size={20} aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </SheetPanel>
    </>
  )
}
