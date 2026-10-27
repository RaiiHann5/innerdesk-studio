import { useMemo } from 'react'
import { CaretDown, CaretUp } from '@phosphor-icons/react'
import { isToday } from 'date-fns'
import { cn } from '@/lib/cn'
import type { Category } from '@/types/domain'
import { EventChip } from './EventChip'
import { LANE_HEIGHT } from './MonthCell'
import { MilestoneChip } from './MilestoneChip'
import { TaskChip } from './TaskChip'
import type { DayColumnLayout } from './hooks/useEventLayout'
import type { WeekBars } from './lib/monthLayout'
import type { Occurrence } from './lib/recurrence'
import { GUTTER_PX } from './lib/timeGeometry'

/** Rows (bars plus tasks) shown before the row offers to expand. */
const COLLAPSED_ROWS = 3

interface AllDayRowProps {
  columns: DayColumnLayout[]
  bars: WeekBars
  categories: Map<string, Category>
  expanded: boolean
  onToggle: () => void
  onOpenEvent: (occurrence: Occurrence) => void
}

/** The "Seharian" row: all-day events, trips and tasks due that day. Sits under the day headers and stays pinned with them. */
export function AllDayRow({ columns, bars, categories, expanded, onToggle, onOpenEvent }: AllDayRowProps) {
  const count = columns.length
  const limit = expanded ? Number.POSITIVE_INFINITY : COLLAPSED_ROWS

  const { shown, laneCount, taskSlots, hidden } = useMemo(() => {
    const shownBars = bars.segments.filter((s) => s.lane < limit)
    const lanes = Math.min(bars.laneCount, limit)
    const slots = Math.max(0, limit - lanes)
    // Milestones and tasks share the slots under the event bars, milestones first.
    const hiddenTasks = columns.reduce((sum, c) => sum + Math.max(0, c.milestones.length + c.tasks.length - slots), 0)
    return {
      shown: shownBars,
      laneCount: lanes,
      taskSlots: slots,
      hidden: bars.segments.length - shownBars.length + hiddenTasks,
    }
  }, [bars, columns, limit])

  const canToggle = hidden > 0 || expanded

  return (
    <div className="flex border-t" role="group" aria-label="Seharian">
      <div className="flex shrink-0 flex-col items-end gap-1 px-2 pt-2.5 text-xs text-muted" style={{ width: GUTTER_PX }}>
        <span>Seharian</span>
        {canToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? 'Ciutkan baris seharian' : `Tampilkan ${hidden} item seharian lainnya`}
            className="flex items-center gap-0.5 rounded-chip tabular-nums transition-colors duration-fast hover:text-ink"
          >
            {expanded ? <CaretUp size={12} aria-hidden /> : <CaretDown size={12} aria-hidden />}
            {!expanded && `+${hidden}`}
          </button>
        )}
      </div>
      <div
        className="relative grid min-w-0 flex-1"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`, minHeight: 36 }}
      >
        {columns.map((c) => (
          <div
            key={c.key}
            className={cn('flex min-w-0 flex-col gap-0.5 border-l px-1 py-1', count > 1 && isToday(c.day) && 'bg-accent-soft/50')}
          >
            <div aria-hidden style={{ height: laneCount * LANE_HEIGHT }} />
            {c.milestones.slice(0, taskSlots).map((item) => (
              <MilestoneChip key={item.milestone.id} item={item} />
            ))}
            {c.tasks.slice(0, Math.max(0, taskSlots - c.milestones.length)).map((task) => (
              <TaskChip key={task.id} task={task} />
            ))}
          </div>
        ))}
        {shown.map((bar) => (
          <EventChip
            key={`${bar.occurrence.instanceKey}-${bar.startCol}`}
            occurrence={bar.occurrence}
            category={categories.get(bar.occurrence.event.categoryId)}
            edge={{ before: bar.continuesBefore, after: bar.continuesAfter }}
            onOpen={() => onOpenEvent(bar.occurrence)}
            className="absolute z-10"
            style={{
              top: 4 + bar.lane * LANE_HEIGHT,
              left: `calc(${(bar.startCol / count) * 100}% + 4px)`,
              width: `calc(${((bar.endCol - bar.startCol + 1) / count) * 100}% - 8px)`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
