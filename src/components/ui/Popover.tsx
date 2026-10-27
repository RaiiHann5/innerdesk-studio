import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { cn } from '@/lib/cn'

interface TriggerProps {
  ref: RefObject<HTMLButtonElement>
  onClick: () => void
  'aria-expanded': boolean
  'aria-haspopup': 'dialog'
  'aria-controls': string
}

interface PopoverProps {
  label: string
  renderTrigger: (props: TriggerProps) => ReactNode
  children: ReactNode
  className?: string
  /** Open the popover from the keyboard shortcut as well as from the trigger. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Popover({ label, renderTrigger, children, className, open: controlledOpen, onOpenChange }: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next)
    onOpenChange?.(next)
  }
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <div className="relative">
      {renderTrigger({
        ref: triggerRef,
        onClick: () => setOpen(!open),
        'aria-expanded': open,
        'aria-haspopup': 'dialog',
        'aria-controls': panelId,
      })}
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={label}
          className={cn(
            'absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] animate-pop-in rounded-card border bg-surface shadow-lift',
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}