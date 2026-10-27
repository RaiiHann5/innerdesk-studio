import { memo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/date'
import type { Category } from '@/types/domain'
import { DayPopover } from './DayPopover'
import { DraggableChip } from './DraggableChip'
import { QuickCreatePopover } from './editor/QuickCreatePopover'
import { MilestoneChip } from './MilestoneChip'
import { TaskChip } from './TaskChip'
import { densityOf } from './hooks/useAgenda'
import type { DayItems } from './lib/calendarItems'
import { allEntries, singleDayEntries } from './lib/dayEntries'
import { isMultiDay } from './lib/monthLayout'
import type { BarSegment } from './lib/monthLayout'
import type { Occurrence } from './lib/recurrence'

/** Row height of one chip or bar, including its gap. Bars are positioned with the same numbers. */
export const LANE_HEIGHT = 22
/** Padding (4) + date row (28) + gap (4): where the first lane starts. */
export const LANES_TOP = 36
/** Chips and bars share these rows; anything beyond goes behind "+N lainnya". */
export const MAX_ROWS = 3

interface MonthCellProps {
  day: Date
  dayKey: string
  inMonth: boolean
  isToday: boolean
  items: DayItems
  /** Bars from this week row that are visible on this day. */
  barsHere: number
  laneCount: number
  categories: Map<string, Category>
  onOpenDay: (date: Date) => void
  /** Opens the editor for a chip. Optional: the dashboard grid has no editor panel. */
  onOpenEvent?: (occurrence: Occurrence) => void
  /** Bars that start in this column are drawn from here, so they stay inside the row's accessibility tree. */
  bars: BarSegment[]
}

export const MonthCell = memo(function MonthCell({
  day,
  dayKey,
  inMonth,
  isToday,
  items,
  barsHere,
  laneCount,
  categories,
  onOpenDay,
  onOpenEvent,
  bars,
}: MonthCellProps) {
  const singles = singleDayEntries(items)
  const multiHere = [...items.allDay, ...items.timed].filter(isMultiDay).length
  const slots = Math.max(0, MAX_ROWS - laneCount)
  const shown = singles.slice(0, slots)
  const hiddenCount = singles.length - shown.length + (multiHere - barsHere)
  const density = densityOf(items.count)
  const fullDate = fmt(day, 'EEEE, d MMMM yyyy')
  // The dashboard shows the month grid without an editor, so a chip there opens the day instead.
  const openChip = (occurrence: Occurrence) => (onOpenEvent ? onOpenEvent(occurrence) : onOpenDay(day))
  // A month cell is a drop target so a chip can be dragged onto another day.
  const { isOver, setNodeRef } = useDroppable({ id: `day:${dayKey}` })

  return (
    <div
      ref={setNodeRef}
      role="gridcell"
      data-day={dayKey}
      aria-label={`${fullDate}, ${items.count === 0 ? 'tidak ada item' : `${items.count} item`}`}
      className={cn(
        'group flex min-w-0 flex-col border-r p-1 last:border-r-0',
        !inMonth && 'bg-hatch',
        isOver && 'bg-accent-soft/60',
      )}
    >
      <div className="mb-1 flex h-7 items-center">
        <button
          type="button"
          onClick={() => onOpenDay(day)}
          aria-label={`Buka hari ${fullDate}`}
          aria-current={isToday ? 'date' : undefined}
          className={cn(
            'grid size-7 place-items-center rounded-full font-display text-base font-bold tabular-nums transition-colors duration-fast',
            isToday ? 'bg-accent text-accent-on' : cn('hover:bg-sunken', inMonth ? 'text-ink' : 'text-muted opacity-60'),
          )}
        >
          {fmt(day, 'd')}
        </button>
        <QuickCreatePopover day={day} alwaysVisible={items.count === 0} />
      </div>

      {/* Below `sm` a chip is too small to read, so the cell shows density dots instead of a list. */}
      <div className="hidden sm:block">
        <div style={{ height: laneCount * LANE_HEIGHT }} aria-hidden />
        {bars.map((bar) => (
          <div
            key={`${bar.occurrence.instanceKey}-${bar.startCol}`}
            className="absolute z-10"
            style={{
              top: LANES_TOP + bar.lane * LANE_HEIGHT,
              left: `calc(${(bar.startCol / 7) * 100}% + 4px)`,
              width: `calc(${((bar.endCol - bar.startCol + 1) / 7) * 100}% - 8px)`,
            }}
          >
            <DraggableChip
              occurrence={bar.occurrence}
              category={categories.get(bar.occurrence.event.categoryId)}
              edge={{ before: bar.continuesBefore, after: bar.continuesAfter }}
              onOpen={() => openChip(bar.occurrence)}
            />
          </div>
        ))}

        <div className="flex min-w-0 flex-col gap-0.5">
          {shown.map((entry) =>
            entry.kind === 'event' ? (
              <DraggableChip
                key={entry.key}
                occurrence={entry.occurrence}
                category={categories.get(entry.occurrence.event.categoryId)}
                onOpen={() => openChip(entry.occurrence)}
              />
            ) : entry.kind === 'milestone' ? (
              <MilestoneChip key={entry.key} item={entry.item} />
            ) : (
              <TaskChip key={entry.key} task={entry.task} />
            ),
          )}
          {hiddenCount > 0 && (
            <DayPopover
              day={day}
              hiddenCount={hiddenCount}
              entries={allEntries(items)}
              categories={categories}
              onOpenDay={onOpenDay}
              onOpenEvent={onOpenEvent}
            />
          )}
        </div>
      </div>

      {density > 0 && (
        <span aria-hidden className="mt-auto flex items-end justify-center gap-0.5 pb-0.5 sm:hidden">
          {Array.from({ length: Math.min(density, 3) }, (_, i) => (
            <span key={i} className="size-1 rounded-full bg-accent" />
          ))}
        </span>
      )}
    </div>
  )
})