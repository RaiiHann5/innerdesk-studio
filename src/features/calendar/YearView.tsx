import { memo, useMemo } from 'react'
import { addDays, eachDayOfInterval, getYear, isSameMonth, isToday, startOfMonth, startOfYear } from 'date-fns'
import { cn } from '@/lib/cn'
import { fmt, toISODate } from '@/lib/date'
import { densityOf } from './hooks/useAgenda'
import { useDayItems } from './hooks/useDayItems'
import { EMPTY_DAY } from './lib/calendarItems'

/** One step of the orange scale, from faint to solid. Three steps: empty, light, busy. */
const DENSITY_CLASS = ['bg-transparent', 'bg-accent/30', 'bg-accent/70'] as const

interface YearViewProps {
  focused: Date
  /** A day opens the day view; a month title opens that month. */
  onOpenDay: (date: Date) => void
  onOpenMonth: (date: Date) => void
}

/**
 * Twelve months at a glance. A day is a square whose fill says how busy it is, so the shape of a
 * year is readable without opening anything.
 */
export function YearView({ focused, onOpenDay, onOpenMonth }: YearViewProps) {
  const year = getYear(focused)
  const range = useMemo(
    () => ({ start: startOfYear(focused), end: addDays(startOfYear(new Date(year, 11, 31)), 1) }),
    [year],
  )
  const items = useDayItems(range)

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="grid" aria-label={`Kalender tahun ${year}`}>
      {Array.from({ length: 12 }, (_, m) => (
        <Month
          key={m}
          month={startOfMonth(new Date(year, m, 1))}
          counts={items}
          selected={isSameMonth(focused, new Date(year, m, 1))}
          onOpenDay={onOpenDay}
          onOpenMonth={onOpenMonth}
        />
      ))}
    </div>
  )
}

interface MonthProps {
  month: Date
  counts: ReturnType<typeof useDayItems>
  selected: boolean
  onOpenDay: (date: Date) => void
  onOpenMonth: (date: Date) => void
}

const Month = memo(function Month({ month, counts, selected, onOpenDay, onOpenMonth }: MonthProps) {
  const days = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(month), end: addDays(startOfMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)), -1) }),
    [month],
  )
  const total = days.reduce((sum, day) => sum + (counts.get(toISODate(day)) ?? EMPTY_DAY).count, 0)

  return (
    <section role="group" aria-label={fmt(month, 'MMMM yyyy')} className="rounded-card border bg-surface p-2">
      <header className="mb-1.5 flex items-baseline justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenMonth(month)}
          className={cn(
            'truncate rounded-chip px-1 text-sm font-bold transition-colors duration-fast hover:bg-sunken',
            selected ? 'text-accent-text' : 'text-ink',
          )}
        >
          {fmt(month, 'MMMM')}
        </button>
        <span className="shrink-0 text-xs tabular-nums text-muted">{total > 0 ? total : ''}</span>
      </header>

      <div className="grid grid-cols-7 gap-[3px]">
        {days.map((day) => {
          const key = toISODate(day)
          const count = (counts.get(key) ?? EMPTY_DAY).count
          const density = densityOf(count)
          return (
            <button
              key={key}
              type="button"
              onClick={() => onOpenDay(day)}
              aria-current={isToday(day) ? 'date' : undefined}
              aria-label={`${fmt(day, 'EEEE, d MMMM')}, ${count === 0 ? 'tidak ada item' : `${count} item`}`}
              className={cn(
                'aspect-square rounded-[3px] transition-transform duration-fast hover:scale-110',
                DENSITY_CLASS[density],
                isToday(day) && 'ring-1 ring-accent',
              )}
            />
          )
        })}
      </div>
    </section>
  )
})