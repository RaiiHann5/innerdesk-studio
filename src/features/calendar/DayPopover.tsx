import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { fmt } from '@/lib/date'
import { useAnchoredPopover } from '@/lib/useAnchoredPopover'
import type { Category } from '@/types/domain'
import { EventChip } from './EventChip'
import { MilestoneChip } from './MilestoneChip'
import { TaskChip } from './TaskChip'
import type { DayEntry } from './lib/dayEntries'
import type { Occurrence } from './lib/recurrence'

const WIDTH = 272

interface DayPopoverProps {
  day: Date
  hiddenCount: number
  entries: DayEntry[]
  categories: Map<string, Category>
  onOpenDay: (date: Date) => void
  /** Opens the editor for one of the listed events. Without it, a chip opens the day instead. */
  onOpenEvent?: (occurrence: Occurrence) => void
}

/** "+N lainnya": the full list for one day, anchored to its trigger and kept inside the viewport. */
export function DayPopover({ day, hiddenCount, entries, categories, onOpenDay, onOpenEvent }: DayPopoverProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const heading = fmt(day, 'EEEE, d MMMM yyyy')
  const position = useAnchoredPopover(open, triggerRef, panelRef, WIDTH)

  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    const close = () => setOpen(false)
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      close()
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          setOpen((o) => !o)
        }}
        className="h-5 w-full rounded-chip px-1.5 text-left text-xs font-medium text-muted transition-colors duration-fast hover:bg-sunken hover:text-ink"
      >
        +{hiddenCount} lainnya
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={`Semua item, ${heading}`}
            tabIndex={-1}
            style={{ width: WIDTH, left: position?.left ?? 0, top: position?.top ?? 0, visibility: position ? 'visible' : 'hidden' }}
            className="fixed z-50 animate-pop-in rounded-card border bg-surface p-2 shadow-lift outline-none"
          >
            <div className="flex items-center justify-between gap-2 px-1 pb-2">
              <h4 className="font-ui text-sm font-bold">{fmt(day, 'EEEE, d MMM')}</h4>
              <Button variant="ghost" className="h-6 px-2 text-xs" onClick={() => onOpenDay(day)}>
                Buka hari
              </Button>
            </div>
            <ul className="max-h-64 space-y-0.5 overflow-y-auto">
              {entries.map((entry) => (
                <li key={entry.key}>
                  {entry.kind === 'event' ? (
                    <EventChip
                      occurrence={entry.occurrence}
                      category={categories.get(entry.occurrence.event.categoryId)}
                      onOpen={() => (onOpenEvent ? onOpenEvent(entry.occurrence) : onOpenDay(day))}
                    />
                  ) : entry.kind === 'milestone' ? (
                    <MilestoneChip item={entry.item} />
                  ) : (
                    <TaskChip task={entry.task} />
                  )}
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </>
  )
}
