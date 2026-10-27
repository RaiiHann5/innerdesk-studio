import { memo, useEffect, useMemo, useState } from 'react'
import { addDays, addMonths, eachDayOfInterval, isSameDay, isSameMonth, isToday } from 'date-fns'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'
import { fmt, toISODate } from '@/lib/date'
import { useDayItems } from './hooks/useDayItems'
import { EMPTY_DAY } from './lib/calendarItems'
import { getVisibleRange, weekStart } from './lib/range'

interface MiniMonthProps {
  focused: Date
  onSelect: (date: Date) => void
}

const WEEKDAYS = eachDayOfInterval({ start: weekStart(new Date()), end: addDays(weekStart(new Date()), 6) })

export function MiniMonth({ focused, onSelect }: MiniMonthProps) {
  const [shown, setShown] = useState(focused)
  const focusedMonth = fmt(focused, 'yyyy-MM')
  // Follow the main view when it moves to another month; paging here stays independent until then.
  useEffect(() => setShown(focused), [focusedMonth])

  const range = useMemo(() => getVisibleRange('month', shown), [shown])
  const items = useDayItems(range)
  const days = useMemo(() => eachDayOfInterval({ start: range.start, end: addDays(range.end, -1) }), [range])

  return (
    <section aria-label="Kalender mini">
      <header className="flex items-center justify-between">
        <h3 aria-live="polite" className="text-base font-bold">
          {fmt(shown, 'MMMM yyyy')}
        </h3>
        <div className="flex">
          <IconButton icon={CaretLeft} label="Bulan sebelumnya" onClick={() => setShown((d) => addMonths(d, -1))} />
          <IconButton icon={CaretRight} label="Bulan berikutnya" onClick={() => setShown((d) => addMonths(d, 1))} />
        </div>
      </header>
      <div role="grid" aria-label={fmt(shown, 'MMMM yyyy')} className="mt-2">
        <div role="row" className="grid grid-cols-7">
          {WEEKDAYS.map((d) => (
            <span key={d.getDay()} role="columnheader" className="py-1 text-center text-xs text-muted">
              {fmt(d, 'EEE')}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = toISODate(day)
            return (
              <MiniDay
                key={key}
                day={day}
                count={(items.get(key) ?? EMPTY_DAY).count}
                inMonth={isSameMonth(day, shown)}
                selected={isSameDay(day, focused)}
                onSelect={onSelect}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}

interface MiniDayProps {
  day: Date
  count: number
  inMonth: boolean
  selected: boolean
  onSelect: (date: Date) => void
}

const MiniDay = memo(function MiniDay({ day, count, inMonth, selected, onSelect }: MiniDayProps) {
  const today = isToday(day)
  const label = `${fmt(day, 'EEEE, d MMMM yyyy')}, ${count === 0 ? 'tidak ada item' : `${count} item`}`
  return (
    <div role="gridcell" className="flex justify-center">
      <button
        type="button"
        aria-label={label}
        aria-current={today ? 'date' : undefined}
        aria-pressed={selected}
        onClick={() => onSelect(day)}
        className={cn('flex h-10 w-9 flex-col text-ink items-center justify-center gap-0.5 rounded-control transition-colors duration-fast', !today && 'hover:bg-sunken')}
      >
        <span
          className={cn(
            'grid size-7 place-items-center rounded-full text-sm tabular-nums',
            today && 'bg-accent font-bold text-accent-on',
            !today && selected && 'bg-sunken font-bold',
            !today && !selected && (inMonth ? 'font-medium' : 'text-muted opacity-60'),
          )}
        >
          {fmt(day, 'd')}
        </span>
        <span aria-hidden className="flex h-1 gap-0.5">
          {Array.from({ length: Math.min(count, 3) }, (_, i) => (
            <span key={i} className="size-1 rounded-full bg-muted" />
          ))}
        </span>
      </button>
    </div>
  )
})
