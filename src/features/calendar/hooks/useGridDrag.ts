import { useCallback, useEffect, useRef, useState } from 'react'
import { startOfDay } from 'date-fns'
import {
  MIN_DRAG_MINUTES,
  moveSpan,
  pointerToSlot,
  resizeSpan,
  slotFromGrab,
  type GridRect,
  type Slot,
  type Span,
} from '../lib/dragGeometry'
import type { Occurrence } from '../lib/recurrence'

export type DragEdge = 'start' | 'end'

/** What a drag is doing. `create` has no event yet; the other two carry the one being dragged. */
export type GridDrag =
  | { kind: 'create'; slot: Slot; span: Span }
  | { kind: 'move'; occurrence: Occurrence; grabOffset: number; slot: Slot; span: Span }
  | { kind: 'resize'; occurrence: Occurrence; edge: DragEdge; slot: Slot; span: Span }

export interface GridDragOptions {
  dayCount: () => number
  /** The hour area, measured fresh on every move so a scrolling grid stays correct. */
  measure: () => GridRect | null
  onDrop: (drag: GridDrag, moved: boolean) => void
  onCancel?: () => void
}

export interface GridDragController {
  drag: GridDrag | null
  /** All three record where the pointer went down, then track it themselves. */
  startCreate: (pointer: { x: number; y: number }) => void
  startMove: (occurrence: Occurrence, grabOffsetMinutes: number) => void
  startResize: (occurrence: Occurrence, edge: DragEdge, span: Span) => void
  /** Arrow keys step a quarter hour, or one whole day across columns. */
  nudge: (code: string) => void
  /** Lifts a block without a pointer, for the keyboard path. */
  lift: (occurrence: Occurrence, dayIndex: number, span: Span) => void
  drop: () => void
  cancel: () => void
  /** True when a drag was lifted and dropped without ever moving: a click, not a move. */
  untouched: boolean
}

const DEFAULT_CREATE_MINUTES = 60
const DAY_MINUTES = 24 * 60

const spanOf = (occurrence: Occurrence): Span => {
  const midnight = startOfDay(occurrence.start).getTime()
  const startMin = (occurrence.start.getTime() - midnight) / 60_000
  const endMin = Math.max(startMin + MIN_DRAG_MINUTES, (occurrence.end.getTime() - midnight) / 60_000)
  return { startMin, endMin }
}

const clampSlot = (slot: Slot, dayCount: number): Slot => ({
  dayIndex: Math.min(Math.max(dayCount - 1, 0), Math.max(0, slot.dayIndex)),
  minutes: Math.max(0, Math.min(DAY_MINUTES, slot.minutes)),
})

/** The one place a slot becomes a span, whichever input produced the slot. */
function settle(drag: GridDrag, slot: Slot, dayCount: number): GridDrag {
  const next = clampSlot(slot, dayCount)
  if (drag.kind === 'create') {
    const length = drag.span.endMin - drag.span.startMin
    return { ...drag, slot: next, span: { startMin: next.minutes, endMin: Math.min(DAY_MINUTES, next.minutes + length) } }
  }
  if (drag.kind === 'move') {
    return {
      ...drag,
      slot: slotFromGrab(next, drag.grabOffset),
      span: moveSpan(drag.span.endMin - drag.span.startMin, drag.grabOffset, next),
    }
  }
  return { ...drag, slot: next, span: resizeSpan(drag.span, drag.edge, next.minutes) }
}

/**
 * Grid dragging, expressed in the units the grid actually uses: a day column and a quarter hour.
 *
 * The pointer, touch and keyboard all pass through `settle`, so the block under the pointer and the
 * block that gets written are computed by identical arithmetic. That is what keeps the live overlap
 * layout and the final placement in agreement.
 */
export function useGridDrag({ dayCount, measure, onDrop, onCancel }: GridDragOptions): GridDragController {
  const [drag, setDrag] = useState<GridDrag | null>(null)
  const dragRef = useRef<GridDrag | null>(null)
  /** Snapshot of where the drag began, so a drop can tell a move from a lift-and-release. */
  const originRef = useRef<GridDrag | null>(null)

  const write = useCallback((next: GridDrag | null) => {
    dragRef.current = next
    setDrag(next)
  }, [])

  // Lifting and releasing without moving is a click, not a move, so the two are told apart.
  const isUntouched = () => {
    const origin = originRef.current
    if (!drag || !origin) return false
    return drag.slot.dayIndex === origin.slot.dayIndex && drag.span.startMin === origin.span.startMin && drag.span.endMin === origin.span.endMin
  }
  const untouched = isUntouched()

  /** Pointer listeners live here, so a caller only has to say where the drag began. */
  useEffect(() => {
    if (!drag) return
    const onMove = (e: PointerEvent) => {
      const grid = measure()
      const current = dragRef.current
      if (!grid || !current) return
      // The pointer is read fresh on every move instead of being accumulated as a delta, so
      // scrolling the grid underneath a drag cannot make the preview drift away from the cursor.
      write(settle(current, pointerToSlot(grid, { x: e.clientX, y: e.clientY }), dayCount()))
    }
    const onUp = () => {
      const current = dragRef.current
      const moved = !untouched
      write(null)
      originRef.current = null
      if (current) onDrop(current, moved)
    }
    const onCancelEvent = () => {
      write(null)
      originRef.current = null
      onCancel?.()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelEvent()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancelEvent)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancelEvent)
      window.removeEventListener('keydown', onKey)
    }
  }, [drag, dayCount, measure, onCancel, onDrop, write, untouched])

  const startCreate = useCallback(
    (pointer: { x: number; y: number }) => {
      const grid = measure()
      if (!grid) return
      const slot = pointerToSlot(grid, pointer)
      const startMin = slot.minutes
      originRef.current = null
      write({ kind: 'create', slot, span: { startMin, endMin: Math.min(DAY_MINUTES, startMin + DEFAULT_CREATE_MINUTES) } })
    },
    [measure, write],
  )

  const startMove = useCallback(
    (occurrence: Occurrence, grabOffsetMinutes: number) => {
      const span = spanOf(occurrence)
      const next: GridDrag = { kind: 'move', occurrence, grabOffset: grabOffsetMinutes, slot: { dayIndex: 0, minutes: span.startMin }, span }
      originRef.current = next
      write(next)
    },
    [write],
  )

  const startResize = useCallback(
    (occurrence: Occurrence, edge: DragEdge, span: Span) => {
      const next: GridDrag = { kind: 'resize', occurrence, edge, slot: { dayIndex: 0, minutes: edge === 'start' ? span.startMin : span.endMin }, span }
      originRef.current = next
      write(next)
    },
    [write],
  )

  /** Enter on a block lifts it in place; arrows then carry it. */
  const lift = useCallback(
    (occurrence: Occurrence, dayIndex: number, span: Span) => {
      const next: GridDrag = {
        kind: 'move',
        occurrence,
        grabOffset: 0,
        slot: { dayIndex, minutes: span.startMin },
        span,
      }
      originRef.current = next
      write(next)
    },
    [write],
  )

  const nudge = useCallback(
    (code: string) => {
      const minutes = code === 'ArrowUp' ? -15 : code === 'ArrowDown' ? 15 : 0
      const days = code === 'ArrowLeft' ? -1 : code === 'ArrowRight' ? 1 : 0
      if (minutes === 0 && days === 0) return
      const current = dragRef.current
      if (!current) return
      write(settle(current, { dayIndex: current.slot.dayIndex + days, minutes: current.slot.minutes + minutes }, dayCount()))
    },
    [dayCount, write],
  )

  const drop = useCallback(() => {
    const current = dragRef.current
    const moved = !untouched
    write(null)
    originRef.current = null
    if (current) onDrop(current, moved)
  }, [onDrop, write, untouched])

  const cancel = useCallback(() => {
    write(null)
    onCancel?.()
  }, [onCancel, write])

  return { drag, startCreate, startMove, startResize, lift, nudge, drop, cancel, untouched }
}

export const minutesToHHMM = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(Math.round(minutes % 60)).padStart(2, '0')}`