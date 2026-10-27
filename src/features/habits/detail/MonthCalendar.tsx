import { useMemo, useState } from 'react'
import { addMonths, parseISO } from 'date-fns'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'
import { fmt, toISODate } from '@/lib/date'
import { monthGrid } from '@/lib/habitInsights'
import { WEEKDAY_SHORT, type LogIndex } from '@/lib/habits'
import type { Habit } from '@/types/domain'
import { HABIT_STYLE } from '../habitUi'
import { statusText } from './statusText'

interface MonthCalendarProps {
  habit: Habit
  index: LogIndex
  today: string
  /** Days that have a journal entry, shown with a dot. */
  noteDates: ReadonlySet<string>
  onPick: (date: string) => void
}

/** One month, a day per cell. Pressing a day opens its status and journal entry, which is how past days are filled in or explained. */
export function MonthCalendar({ habit, index, today, noteDates, onPick }: MonthCalendarProps) {
  const [month, setMonth] = useState(`${today.slice(0, 7)}-01`)
  const style = HABIT_STYLE[habit.color]
  const rows = useMemo(() => monthGrid(habit, index, month, today), [habit, index, month, today])
  const canGoBack = month.slice(0, 7) > habit.startDate.slice(0, 7)
  const canGoForward = month.slice(0, 7) < today.slice(0, 7)
  const move = (by: number) => setMonth(toISODate(addMonths(parseISO(month), by)))

  return (
    <section aria-label="Kalender kebiasaan" className="rounded-card border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h3 aria-live="polite" className="font-medium capitalize">
          {fmt(month, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-1">
          <IconButton icon={CaretLeft} label="Bulan sebelumnya" disabled={!canGoBack} onClick={() => move(-1)} className="border disabled:opacity-40" />
          <IconButton icon={CaretRight} label="Bulan berikutnya" disabled={!canGoForward} onClick={() => move(1)} className="border disabled:opacity-40" />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-muted" aria-hidden>
        {WEEKDAY_SHORT.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {rows.flat().map((cell) => {
          if (!cell.inMonth) return <span key={cell.date} aria-hidden />
          const future = cell.state === 'future'
          const hasNote = noteDates.has(cell.date)
          return (
            <button
              key={cell.date}
              type="button"
              disabled={future}
              onClick={() => onPick(cell.date)}
              aria-label={`${fmt(cell.date, 'EEEE d MMMM')}: ${statusText(habit, index, cell.date, cell.state)}${hasNote ? ', ada catatan' : ''}`}
              className={cn(
                'relative grid aspect-square place-items-center rounded-control text-sm tabular-nums outline-none transition-colors duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-text',
                cell.state === 'done' && cn(style.solid, 'text-surface'),
                cell.state === 'partial' && cn(style.tint, 'text-ink'),
                cell.state === 'missed' && 'bg-sunken text-ink hover:bg-sunken/70',
                cell.state === 'open' && 'border border-dashed border-faint text-ink hover:border-ink',
                cell.state === 'off' && 'text-faint hover:bg-sunken/50',
                future && 'cursor-default text-faint opacity-40',
                cell.date === today && 'font-bold ring-2 ring-ink/70',
              )}
            >
              {Number(cell.date.slice(8))}
              {hasNote && <span aria-hidden className="absolute bottom-1 size-1 rounded-full bg-current opacity-70" />}
            </button>
          )
        })}
      </div>

      <ul aria-hidden className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className={cn('size-2.5 rounded-[3px]', style.solid)} />
          Selesai
        </li>
        <li className="flex items-center gap-1.5">
          <span className={cn('size-2.5 rounded-[3px]', style.tint)} />
          Sebagian
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-sunken" />
          Terlewat
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-1 rounded-full bg-ink opacity-70" />
          Ada catatan
        </li>
      </ul>
    </section>
  )
}
