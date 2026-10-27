import { memo, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { MapPin, Repeat } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/date'
import type { Category } from '@/types/domain'
import { CATEGORY_STYLE } from './categories'
import type { PlacedItem } from './lib/overlap'
import type { Occurrence } from './lib/recurrence'
import { minutesToPx } from './lib/timeGeometry'

/** Below this height the block is a single line: title and start time. */
const COMPACT_BELOW = 44
/** From this height a location line fits under the time. */
const SHOW_PLACE_FROM = 84
/** Thickness of the invisible strips that grab an edge, in px. */
const HANDLE = 7

interface EventBlockProps {
  placed: PlacedItem<Occurrence>
  category?: Category
  /** Without a handler the block is not a button; it stays focusable so screen readers can reach it. */
  onOpen?: () => void
  /** Pointer move. Offsets from the block's own top edge, so the grab point is preserved. */
  onMoveStart?: (offsetMinutes: number, event: ReactPointerEvent) => void
  onResizeStart?: (edge: 'start' | 'end', event: ReactPointerEvent) => void
  /** Enter lifts the block for the keyboard path instead of opening it. */
  onLift?: () => void
  /** Set while this block is the one being dragged or keyboard-lifted. */
  dragging?: boolean
  style?: CSSProperties
  className?: string
}

/**
 * A timed event on the grid: light tint, 3px category bar on the left, positioned by its start and end.
 *
 * Dragging is deliberately not wired to a library here. The grid needs a start and an end in whole
 * quarter hours, not a pixel offset, so `onMoveStart` and `onResizeStart` hand the grab point to the
 * grid, which owns the arithmetic. A click without movement still opens the event.
 */
export const EventBlock = memo(function EventBlock({
  placed,
  category,
  onOpen,
  onMoveStart,
  onResizeStart,
  onLift,
  dragging,
  style,
  className,
}: EventBlockProps) {
  const { item, startMin, endMin, column, columns, span, continuesBefore, continuesAfter } = placed
  const { event, start, end, isRecurring } = item
  const color = category ? CATEGORY_STYLE[category.colorToken] : null
  const height = minutesToPx(endMin - startMin) - 2
  const compact = height < COMPACT_BELOW
  const place = event.location
  const range = `${fmt(start, 'HH:mm')} - ${fmt(end, 'HH:mm')}`

  const blockStyle: CSSProperties = {
    top: minutesToPx(startMin) + 1,
    height,
    left: `calc(${(column / columns) * 100}% + 2px)`,
    width: `calc(${(span / columns) * 100}% - 4px)`,
    ...style,
  }
  const Tag = onOpen ? 'button' : 'div'

  const grab = (e: ReactPointerEvent) => {
    if (!onMoveStart) return
    // Ignore a drag that starts on a resize edge or on the repeat badge.
    if ((e.target as HTMLElement).closest('[data-no-move]')) return
    const box = e.currentTarget.getBoundingClientRect()
    const offsetMinutes = ((e.clientY - box.top) / box.height) * (endMin - startMin)
    onMoveStart(offsetMinutes, e)
  }

  return (
    <div
      style={blockStyle}
      className={cn(
        'absolute overflow-hidden rounded-control bg-surface text-left text-xs transition-[filter] duration-fast hover:brightness-95',
        continuesBefore ? 'rounded-t-none' : 'rounded-t-control',
        continuesAfter ? 'rounded-b-none' : 'rounded-b-control',
        dragging && 'opacity-40',
        className,
      )}
    >
      <Tag
        {...(onOpen ? { type: 'button' as const, onClick: onOpen } : { tabIndex: 0, role: 'group' })}
        onPointerDown={onMoveStart ? grab : undefined}
        onKeyDown={
          onLift
            ? (e) => {
                if (e.key !== 'Enter') return
                // Enter lifts instead of opening; a lift that never moves still opens on drop.
                e.preventDefault()
                onLift()
              }
            : undefined
        }
        aria-label={`${event.title}, ${fmt(start, 'HH:mm')} sampai ${fmt(end, 'HH:mm')}${category ? `, ${category.name}` : ''}`}
        title={`${event.title}\n${range}${place ? `\n${place}` : ''}`}
        className="absolute inset-0 z-10 flex flex-col gap-0.5 overflow-hidden py-1 pl-2.5 pr-1.5 text-left focus-visible:z-20"
      >
        <span aria-hidden className={cn('absolute inset-0 -z-10', color?.tint ?? 'bg-sunken')} />
        <span aria-hidden className={cn('absolute inset-y-0 left-0 -z-10 w-[3px]', color?.bar ?? 'bg-faint')} />
        {compact ? (
          // Title and start time share a line; when they do not fit, the time wraps below and is clipped away or shown if there is room.
          <span className="relative flex h-full min-w-0 flex-wrap content-start gap-x-1.5 overflow-hidden">
            <span className="max-w-full truncate font-medium">{event.title}</span>
            <span className="tabular-nums text-muted">{fmt(start, 'HH:mm')}</span>
          </span>
        ) : (
          <span className="relative flex min-w-0 flex-col gap-0.5">
            <span className="line-clamp-2 font-medium">{event.title}</span>
            <span className="flex min-w-0 items-start gap-1 tabular-nums text-muted">
              {/* The end time wraps below the start and is clipped when the column is too narrow, instead of cutting a number in half. */}
              <span className="flex max-h-4 min-w-0 flex-wrap gap-x-1 overflow-hidden">
                <span>{fmt(start, 'HH:mm')}</span>
                <span>- {fmt(end, 'HH:mm')}</span>
              </span>
              {isRecurring && (
                <span data-no-move className="flex shrink-0 items-center">
                  <Repeat size={12} aria-hidden />
                </span>
              )}
            </span>
            {place && height >= SHOW_PLACE_FROM && (
              <span className="flex min-w-0 items-center gap-1 text-muted">
                <MapPin size={12} aria-hidden className="shrink-0" />
                <span className="truncate">{place}</span>
              </span>
            )}
          </span>
        )}
      </Tag>

      {onResizeStart && height >= HANDLE * 3 && (
        <>
          <ResizeEdge edge="start" top={0} height={HANDLE} label={`Ubah waktu mulai ${event.title}`} onResizeStart={onResizeStart} />
          <ResizeEdge
            edge="end"
            top={`calc(100% - ${HANDLE}px)`}
            height={HANDLE}
            label={`Ubah waktu selesai ${event.title}`}
            onResizeStart={onResizeStart}
          />
        </>
      )}
    </div>
  )
})

interface ResizeEdgeProps {
  edge: 'start' | 'end'
  top: number | string
  height: number
  label: string
  onResizeStart: (edge: 'start' | 'end', event: ReactPointerEvent) => void
}

/**
 * An invisible strip on one edge. Keyboard reachable, so a block can be resized without a pointer:
 * it is a real button, just without a resting appearance.
 */
function ResizeEdge({ edge, top, height, label, onResizeStart }: ResizeEdgeProps) {
  return (
    <button
      type="button"
      data-no-move
      aria-label={label}
      onPointerDown={(e) => {
        e.stopPropagation()
        onResizeStart(edge, e)
      }}
      className={cn(
        'absolute inset-x-0 z-20 cursor-ns-resize touch-none focus-visible:bg-accent/25',
        edge === 'start' ? 'rounded-t-control' : 'rounded-b-control',
      )}
      style={{ top, height }}
    />
  )
}