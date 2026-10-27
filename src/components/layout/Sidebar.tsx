import { NavLink } from 'react-router-dom'
import { SidebarSimple } from '@phosphor-icons/react'
import { NAV_SECTIONS, SETTINGS_ITEM, type NavItem } from '@/app/nav'
import { cn } from '@/lib/cn'
import { IconButton } from '@/components/ui/IconButton'
import { BrandLogo } from './BrandLogo'

interface SidebarProps {
  collapsed: boolean
  /** Hidden when the layout forces the collapsed state (tablet). */
  canToggle: boolean
  onToggle: () => void
}

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { icon: IconComponent } = item
  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'flex h-9 items-center gap-2.5 rounded-control text-sm font-medium transition-colors duration-fast',
          // Orange marks where you are, the same as the active view tab.
          isActive ? 'bg-accent-soft text-accent-text' : 'text-muted hover:bg-sunken hover:text-ink',
          collapsed ? 'justify-center px-0' : 'px-[9px]',
        )
      }
    >
      <IconComponent aria-hidden size={18} weight="regular" className="shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  )
}

/** A group heading. Hidden when collapsed, since the icons alone still read in order. */
function SectionLabel({ children }: { children: string }) {
  return <h2 className="px-[9px] pb-2 pt-7 text-xs font-medium text-muted first:pt-0">{children}</h2>
}

export function Sidebar({ collapsed, canToggle, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r bg-surface py-3 transition-[width] duration-base md:flex',
        collapsed ? 'w-[60px] px-2' : 'w-56 px-3',
      )}
    >
      {/* The brand block is indented to the same 9px as the nav icons, so the two left edges line up. */}
      <div className={cn('flex h-9 items-center', collapsed ? 'justify-center' : 'px-[9px]')}>
        <BrandLogo variant={collapsed ? 'mark' : 'full'} className={collapsed ? 'h-7' : 'h-9'} />
      </div>

      <nav aria-label="Navigasi utama" className="mt-7 flex flex-col">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {collapsed ? <div className="my-3 border-t first:mt-0" /> : <SectionLabel>{section.label}</SectionLabel>}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <SidebarLink item={item} collapsed={collapsed} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Settings and the collapse control sit apart from the groups, so the footer reads as its own place. */}
      <div className="mt-auto border-t pt-3">
        <SidebarLink item={SETTINGS_ITEM} collapsed={collapsed} />
        {canToggle && (
          <IconButton
            icon={SidebarSimple}
            label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            onClick={onToggle}
            className={cn('h-9 w-full', collapsed ? 'justify-center px-0' : 'justify-start px-[9px]')}
          />
        )}
      </div>
    </aside>
  )
}