import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { DotsThree, type Icon } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { IconButton } from './IconButton'

export interface MenuItem {
  label: string
  icon: Icon
  onSelect: () => void
  tone?: 'danger'
}

interface MenuProps {
  /** Names both the trigger and the menu for assistive technology. */
  label: string
  items: MenuItem[]
  className?: string
}

/**
 * A kebab menu. The trigger opens it, the first item takes focus, arrows move between items,
 * Escape and Tab close it, and choosing an item returns focus to the trigger before it runs.
 */
export function Menu({ label, items, className }: MenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const entries = () => Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])

  useEffect(() => {
    if (!open) return
    entries()[0]?.focus()
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  const onPanelKeyDown = (e: KeyboardEvent) => {
    const list = entries()
    const index = list.indexOf(document.activeElement as HTMLButtonElement)
    const target = { ArrowDown: (index + 1) % list.length, ArrowUp: (index - 1 + list.length) % list.length, Home: 0, End: list.length - 1 }[e.key]
    if (target !== undefined) {
      e.preventDefault()
      list[target].focus()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      triggerRef.current?.focus()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <IconButton
        ref={triggerRef}
        icon={DotsThree}
        label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className="text-md"
      />
      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label={label}
          onKeyDown={onPanelKeyDown}
          className="absolute right-0 top-full z-40 mt-1 w-44 animate-pop-in rounded-card border bg-surface p-1 shadow-lift"
        >
          {items.map(({ label: itemLabel, icon: ItemIcon, onSelect, tone }) => (
            <button
              key={itemLabel}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                setOpen(false)
                triggerRef.current?.focus()
                onSelect()
              }}
              className={cn(
                'flex h-8 w-full items-center gap-2 rounded-chip px-2 text-left text-sm outline-none transition-colors duration-fast',
                'hover:bg-sunken focus-visible:bg-sunken focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-text',
                tone === 'danger' ? 'text-status-overdue' : 'text-ink',
              )}
            >
              <ItemIcon size={16} aria-hidden />
              {itemLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
