import { cn } from '@/lib/cn'
import { fmt } from '@/lib/date'
import type { CalendarEvent } from '@/types/domain'
import { CATEGORY_STYLE } from './categories'
import { useCategories } from './hooks/useCategories'

interface WeekEventChipProps {
  event: CalendarEvent
  /** Stacked puts the time above the title, for narrow columns. */
  layout?: 'inline' | 'stacked'
}

export function WeekEventChip({ event, layout = 'inline' }: WeekEventChipProps) {
  const stacked = layout === 'stacked'
  const { byId } = useCategories()
  const color = byId.get(event.categoryId)?.colorToken
  return (
    <div
      title={`${event.title}, ${fmt(event.start, 'HH.mm')} sampai ${fmt(event.end, 'HH.mm')}`}
      className={cn('rounded-control bg-sunken px-1.5 py-1 text-xs', stacked ? 'space-y-0.5' : 'flex items-center gap-1.5')}
    >
      <span className="flex items-center gap-1.5">
        <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', color ? CATEGORY_STYLE[color].bar : 'bg-faint')} />
        <span className="shrink-0 tabular-nums text-muted">{fmt(event.start, 'HH.mm')}</span>
      </span>
      <span className={cn('block font-medium', stacked ? 'line-clamp-2' : 'truncate')}>{event.title}</span>
    </div>
  )
}
