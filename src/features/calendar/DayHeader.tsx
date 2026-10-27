import type { ReactNode } from 'react'
import { isToday } from 'date-fns'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/date'

interface DayHeaderProps {
  day: Date
  /** Week view: the header is a button that opens the day. Day view leaves it out. */
  onOpen?: (date: Date) => void
  /** Day view: room for the weather summary. */
  trailing?: ReactNode
}

/** Short day name and the date number in the display font. Today is the same filled orange circle as in the month grid. */
export function DayHeader({ day, onOpen, trailing }: DayHeaderProps) {
  const today = isToday(day)
  const content = (
    <>
      <span className={cn('text-sm font-medium', today ? 'text-accent-text' : 'text-muted')}>
        {fmt(day, onOpen ? 'EEE' : 'EEEE')}
      </span>
      <span
        aria-current={today ? 'date' : undefined}
        className={cn(
          'grid size-9 place-items-center rounded-full font-display text-lg font-bold tabular-nums',
          today ? 'bg-accent text-accent-on' : 'text-ink',
        )}
      >
        {fmt(day, 'd')}
      </span>
    </>
  )

  if (!onOpen) {
    return (
      <div role="columnheader" className="flex items-center gap-2.5 border-l px-3 py-2">
        {content}
        {trailing && <div className="ml-auto">{trailing}</div>}
      </div>
    )
  }
  return (
    <div role="columnheader" className="border-l">
      <button
        type="button"
        onClick={() => onOpen(day)}
        aria-label={`Buka hari ${fmt(day, 'EEEE, d MMMM yyyy')}`}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors duration-fast hover:bg-sunken"
      >
        {content}
      </button>
    </div>
  )
}
