import { useLayoutEffect, useState, type RefObject } from 'react'

export interface AnchoredPosition {
  left: number
  top: number
}

const MARGIN = 8
const GAP = 4

/**
 * Places a floating panel beside its trigger, flipping above when there is no room below and
 * clamped to the viewport. Returns null until it has been measured once, so nothing is drawn
 * in the wrong spot first.
 */
export function useAnchoredPopover(
  open: boolean,
  triggerRef: RefObject<HTMLElement>,
  panelRef: RefObject<HTMLElement>,
  width: number,
): AnchoredPosition | null {
  const [position, setPosition] = useState<AnchoredPosition | null>(null)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !panelRef.current) return
    const trigger = triggerRef.current.getBoundingClientRect()
    const height = panelRef.current.offsetHeight
    const left = Math.min(Math.max(MARGIN, trigger.left), window.innerWidth - width - MARGIN)
    const below = trigger.bottom + GAP
    const top = below + height > window.innerHeight - MARGIN ? Math.max(MARGIN, trigger.top - height - GAP) : below
    setPosition((current) => (current && current.left === left && current.top === top ? current : { left, top }))
  }, [open, triggerRef, panelRef, width])

  return position
}