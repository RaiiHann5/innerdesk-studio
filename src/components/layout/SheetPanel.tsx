import { useEffect, useRef, type ReactNode } from 'react'
import { X } from '@phosphor-icons/react'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface SheetPanelProps {
  open: boolean
  onClose: () => void
  label: string
  /** A drawer slides in from the side; a sheet rises from the bottom. Only phones get a sheet. */
  sheet?: boolean
  /** A wider drawer for forms. Has no effect on a sheet, which always spans the screen. */
  wide?: boolean
  /** Shown under the title, such as a save status. */
  headerExtra?: ReactNode
  children: ReactNode
}

/**
 * The overlay panel below the desktop breakpoint.
 *
 * Escape and a click on the scrim both close it, and focus moves into the panel on open and back to
 * whatever was focused before on close, so the panel never strands keyboard focus behind itself.
 * Pass a stable `onClose` (useCallback): a new function each render re-runs the focus logic.
 */
export function SheetPanel({ open, onClose, label, sheet, wide, headerExtra, children }: SheetPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const returnToRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    returnToRef.current = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose()
      if (e.key !== 'Tab' || !panelRef.current) return
      // The panel is modal, so Tab cycles inside it instead of walking into the page behind the scrim.
      const stops = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null)
      if (stops.length === 0) return
      const first = stops[0]
      const last = stops[stops.length - 1]
      const current = document.activeElement
      if (e.shiftKey && (current === first || current === panelRef.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && current === last) {
        e.preventDefault()
        first.focus()
      } else if (!panelRef.current.contains(current)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      returnToRef.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <button
        type="button"
        // A mouse shortcut only: the dialog has its own close button, so this one is hidden from assistive technology.
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 z-40 !m-0 cursor-default bg-ink/40"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          // !m-0: a parent with space-y-* would otherwise push these fixed layers down by one gap.
          'fixed z-50 !m-0 flex flex-col border-line bg-surface shadow-lift outline-none',
          sheet ? 'inset-x-0 bottom-0 max-h-[85dvh] animate-slide-up rounded-t-card border-t' : cn('inset-y-0 right-0 max-w-full animate-slide-in border-l', wide ? 'w-[26rem]' : 'w-80'),
        )}
      >
        <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-md font-bold">{label}</h2>
            {headerExtra}
          </div>
          <IconButton icon={X} label="Tutup panel" onClick={onClose} />
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </>
  )
}