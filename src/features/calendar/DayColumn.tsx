import { memo, type PointerEvent as ReactPointerEvent } from 'react'
import { cn } from '@/lib/cn'
import { fmt, toISODate } from '@/lib/date'
import type { Category } from '@/types/domain'
import { DragPreview } from './DragPreview'
import { EventBlock } from './EventBlock'
import { TaskTimeChip } from './TaskTimeChip'
import type { TimedTask } from './lib/calendarItems'
import type { PlacedItem } from './lib/overlap'
import type { Occurrence } from './lib/recurrence'

export interface ColumnPreview {
  startMin: number
  endMin: number
  title: string
  categoryId: string | null
  dashed: boolean
  label: string
  /** Only the column under the pointer draws it. */
  columnKey: string
}

interface DayColumnProps {
  day: Date
  placed: PlacedItem<Occurrence>[]
  /** Tasks with a time of day, drawn as a thin rule at their minute. */
  timedTasks?: TimedTask[]
  /** Tints the column. Only the week view does; a single wide column needs no marker. */
  isToday: boolean
  categories: Map<string, Category>
  /** Opens the editor for a block. */
  onOpenEvent: (occurrence: Occurrence) => void
  /** Dragging a new event into existence starts on this empty surface. */
  onCreateStart?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onMoveStart?: (occurrence: Occurrence, offsetMinutes: number, event: ReactPointerEvent) => void
  onResizeStart?: (occurrence: Occurrence, edge: 'start' | 'end', event: ReactPointerEvent) => void
  /** Enter lifts a block for the keyboard path. */
  onLift?: (occurrence: Occurrence, dayIndex: number, span: { startMin: number; endMin: number }) => void
  /** Index of this column in the visible range, so a lift starts in the right place. */
  dayIndex?: number
  draggingKey?: string | null
  preview?: ColumnPreview | null
}

/** One day of the grid: a positioned layer for its events, and the surface that starts a new one. The hour lines live behind, in HourLines. */
export const DayColumn = memo(function DayColumn({
  day,
  placed,
  timedTasks,
  isToday,
  categories,
  onOpenEvent,
  onCreateStart,
  onMoveStart,
  onResizeStart,
  onLift,
  dayIndex,
  draggingKey,
  preview,
}: DayColumnProps) {
  const dayKey = toISODate(day)
  const showPreview = preview?.columnKey === dayKey ? preview : null

  return (
    <div
      role="group"
      aria-label={`${fmt(day, 'EEEE, d MMMM yyyy')}, ${placed.length} event terjadwal`}
      className={cn('relative border-l', isToday && 'bg-accent-soft/50')}
    >
      {onCreateStart && <div onPointerDown={onCreateStart} className="absolute inset-0 cursor-crosshair touch-none" aria-hidden />}
      {timedTasks?.map((timed) => (
        <TaskTimeChip key={timed.task.id} task={timed.task} minutes={timed.minutes} />
      ))}
      {placed.map((p) => (
        <EventBlock
          key={p.item.instanceKey}
          placed={p}
          category={categories.get(p.item.event.categoryId)}
          onOpen={() => onOpenEvent(p.item)}
          onMoveStart={onMoveStart && ((offset, event) => onMoveStart(p.item, offset, event))}
          onResizeStart={
            onResizeStart && ((edge, event) => onResizeStart(p.item, edge, event))
          }
          onLift={
            onLift && dayIndex !== undefined ? () => onLift(p.item, dayIndex, { startMin: p.startMin, endMin: p.endMin }) : undefined
          }
          dragging={draggingKey === p.item.instanceKey}
          className="z-10"
        />
      ))}
      {showPreview && (
        <DragPreview
          startMin={showPreview.startMin}
          endMin={showPreview.endMin}
          title={showPreview.title}
          category={showPreview.categoryId ? categories.get(showPreview.categoryId) : undefined}
          dashed={showPreview.dashed}
          label={showPreview.label}
        />
      )}
    </div>
  )
})