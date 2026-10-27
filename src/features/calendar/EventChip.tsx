import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/date'
import type { Category } from '@/types/domain'
import { CATEGORY_STYLE } from './categories'
import type { Occurrence } from './lib/recurrence'

interface EventChipProps {
  occurrence: Occurrence
  category?: Category
  /** Set when drawn as part of a multi-day bar: whether the event continues past either edge of this row. */
  edge?: { before: boolean; after: boolean }
  /** Without a handler the chip is not a button; it stays focusable so screen readers can reach it. */
  onOpen?: () => void
  style?: CSSProperties
  className?: string
}

/** Compact event: tinted surface, 3px category bar on the left, title and (for timed events) the start time. */
export function EventChip({ occurrence, category, edge, onOpen, style, className }: EventChipProps) {
  const { event, start, end } = occurrence
  const color = category ? CATEGORY_STYLE[category.colorToken] : null
  const when = event.allDay ? 'seharian' : `${fmt(start, 'HH:mm')} sampai ${fmt(end, 'HH:mm')}`
  const showTime = !event.allDay && !edge
  const Tag = onOpen ? 'button' : 'div'
  return (
    <Tag
      {...(onOpen ? { type: 'button' as const, onClick: onOpen } : { tabIndex: 0, role: 'group' })}
      style={style}
      aria-label={`${event.title}, ${when}${category ? `, ${category.name}` : ''}`}
      title={`${event.title}\n${when}`}
      className={cn(
        'flex h-5 w-full min-w-0 items-center gap-1.5 overflow-hidden text-left text-xs transition-colors duration-fast hover:brightness-95',
        color?.tint ?? 'bg-sunken',
        edge ? cn(!edge.before && 'rounded-l-chip', !edge.after && 'rounded-r-chip') : 'rounded-chip',
        className,
      )}
    >
      {!edge?.before ? (
        <span aria-hidden className={cn('h-full w-[3px] shrink-0', color?.bar ?? 'bg-faint')} />
      ) : (
        <span aria-hidden className="w-0.5 shrink-0" />
      )}
      {showTime && <span className="shrink-0 tabular-nums text-muted">{fmt(start, 'HH:mm')}</span>}
      <span className="truncate font-medium">{event.title}</span>
    </Tag>
  )
}
