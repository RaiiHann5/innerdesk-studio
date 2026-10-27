import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { addDays, addMonths, endOfMonth, endOfWeek, isSameMonth, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'
import { fmt, isoDay, toISODate } from '@/lib/date'
import type { MoodEntry } from '@/types/domain'
import { MOOD_FILL, MOOD_LABEL, MOOD_LEVELS, MOOD_SWATCH } from './lib/levels'

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const WEEK = { weekStartsOn: 1 } as const

interface MoodHeatmapProps {
  entries: MoodEntry[]
  /** Day to outline, such as the one open in the check-in. */
  selectedDate?: string
  onSelect: (date: string) => void
}

/** One month, weeks as rows from Monday. A grid with one tab stop: arrows move by day or week, Page Up/Down by month. */
export function MoodHeatmap({ entries, selectedDate, onSelect }: MoodHeatmapProps) {
  const today = isoDay(0)
  const [month, setMonth] = useState(() => startOfMonth(parseISO(selectedDate ?? today)))
  const [focused, setFocused] = useState(selectedDate ?? today)
  const cells = useRef(new Map<string, HTMLButtonElement>())
  const moveFocus = useRef(false)

  useEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    cells.current.get(focused)?.focus()
  }, [focused, month])

  const byDate = new Map(entries.map((e) => [e.date, e]))
  const gridStart = startOfWeek(month, WEEK)
  const gridEnd = endOfWeek(endOfMonth(month), WEEK)
  const weeks: string[][] = []
  for (let day = gridStart; day <= gridEnd; day = addDays(day, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => toISODate(addDays(day, i))))
  }

  const inMonth = (date: string) => isSameMonth(parseISO(date), month)
  const tabbable = inMonth(focused) && focused <= today ? focused : inMonth(today) ? today : toISODate(month)
  const atCurrentMonth = isSameMonth(month, parseISO(today)) || month > parseISO(today)

  const goTo = (date: string) => {
    if (date > today) return
    moveFocus.current = true
    setFocused(date)
    setMonth(startOfMonth(parseISO(date)))
  }
  const shiftMonth = (by: number) => {
    // Same day of the month in the new month, kept out of the future.
    const target = toISODate(addMonths(parseISO(tabbable), by))
    setMonth(addMonths(month, by))
    setFocused(target > today ? today : target)
  }

  const onKeyDown = (event: KeyboardEvent, date: string) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key]
    if (step) {
      event.preventDefault()
      goTo(toISODate(addDays(parseISO(date), step)))
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault()
      const next = toISODate(addMonths(parseISO(date), event.key === 'PageUp' ? -1 : 1))
      goTo(next > today ? today : next)
    }
  }

  const monthLabel = fmt(month, 'MMMM yyyy')

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 aria-live="polite" className="font-display text-md font-bold tracking-tight">
          {monthLabel}
        </h3>
        <div className="-mr-1 flex">
          <IconButton icon={CaretLeft} label="Bulan sebelumnya" onClick={() => shiftMonth(-1)} />
          <IconButton icon={CaretRight} label="Bulan berikutnya" disabled={atCurrentMonth} onClick={() => shiftMonth(1)} className="disabled:opacity-40" />
        </div>
      </div>

      <div role="grid" aria-label={`Suasana hati ${monthLabel}`} className="space-y-1.5">
        <div role="row" className="grid grid-cols-7 gap-1.5 text-center text-xs text-muted">
          {WEEKDAYS.map((d) => (
            <span key={d} role="columnheader">
              {d}
            </span>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0]} role="row" className="grid grid-cols-7 gap-1.5">
            {week.map((date) => {
              if (!inMonth(date)) return <span key={date} role="gridcell" aria-hidden />
              const entry = byDate.get(date)
              const future = date > today
              const label = `${fmt(date, 'd MMMM')}: ${
                entry ? `${entry.level} dari 5, ${MOOD_LABEL[entry.level].toLowerCase()}` : future ? 'belum tiba' : 'belum dicatat'
              }`
              return (
                <span key={date} role="gridcell">
                  <button
                    ref={(el) => {
                      if (el) cells.current.set(date, el)
                      else cells.current.delete(date)
                    }}
                    type="button"
                    disabled={future}
                    tabIndex={date === tabbable ? 0 : -1}
                    aria-label={label}
                    aria-current={date === today ? 'date' : undefined}
                    aria-pressed={selectedDate === undefined ? undefined : date === selectedDate}
                    onClick={() => {
                      setFocused(date)
                      onSelect(date)
                    }}
                    onKeyDown={(e) => onKeyDown(e, date)}
                    className={cn(
                      'flex h-10 w-full items-center justify-center rounded-control border text-sm tabular-nums transition-colors duration-fast',
                      entry ? cn(MOOD_FILL[entry.level], 'border-ink/10') : 'border-dashed text-muted hover:border-faint hover:text-ink',
                      future && 'opacity-40',
                      date === today && 'font-bold underline underline-offset-4',
                      selectedDate === date && 'border-2 border-ink',
                    )}
                  >
                    {fmt(date, 'd')}
                  </button>
                </span>
              )
            })}
          </div>
        ))}
      </div>

      <ul aria-label="Keterangan warna" className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        {MOOD_LEVELS.map((level) => (
          <li key={level} className="flex items-center gap-1.5">
            <span aria-hidden className={cn('size-3 rounded-chip border border-ink/20', MOOD_SWATCH[level])} />
            {MOOD_LABEL[level]}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-chip border border-dashed" />
          Belum dicatat
        </li>
      </ul>
    </div>
  )
}
