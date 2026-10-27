import { getISODay, parseISO } from 'date-fns'
import { Check } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/date'
import { WEEKDAY_SHORT, cellState, lastDays, type CellState, type LogIndex } from '@/lib/habits'
import type { Habit } from '@/types/domain'
import { toggleHabitDay } from './habitActions'
import { HABIT_STYLE } from './habitUi'

const STATE_TEXT: Record<CellState, string> = {
  done: 'selesai',
  partial: 'sebagian',
  missed: 'terlewat',
  off: 'bukan hari terjadwal',
  open: 'belum selesai',
  future: 'belum tiba',
}

interface WeekStripProps {
  habit: Habit
  index: LogIndex
  today: string
}

/** The last seven days of one habit. Tapping a due day finishes it or empties it, which is how a forgotten day is filled in. */
export function WeekStrip({ habit, index, today }: WeekStripProps) {
  const style = HABIT_STYLE[habit.color]
  return (
    <ul aria-label={`Tujuh hari terakhir: ${habit.name}`} className="flex gap-1">
      {lastDays(today, 7).map((date) => {
        const state = cellState(habit, index, date, today)
        const off = state === 'off'
        return (
          <li key={date}>
            <button
              type="button"
              disabled={off}
              aria-pressed={state === 'done'}
              aria-label={`${fmt(date, 'EEEE d MMMM')}: ${STATE_TEXT[state]}`}
              title={`${fmt(date, 'EEE d MMM')}: ${STATE_TEXT[state]}`}
              onClick={() => void toggleHabitDay(habit, date)}
              className="flex w-8 flex-col items-center gap-1 rounded-chip py-0.5 text-xs outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-text disabled:cursor-default"
            >
              <span className={cn('leading-3', date === today ? 'font-bold text-ink' : 'text-muted')}>{WEEKDAY_SHORT[getISODay(parseISO(date)) - 1].slice(0, 3)}</span>
              <span
                aria-hidden
                className={cn(
                  'grid size-6 place-items-center rounded-full border transition-colors duration-fast',
                  state === 'done' && cn(style.solid, 'border-transparent text-surface'),
                  state === 'partial' && cn(style.tint, 'border-transparent'),
                  state === 'missed' && 'border-transparent bg-sunken hover:border-faint',
                  state === 'open' && 'border-dashed border-faint hover:border-ink',
                  off && 'border-transparent opacity-30',
                )}
              >
                {state === 'done' ? <Check size={12} weight="bold" /> : off ? <span className="size-1 rounded-full bg-faint" /> : null}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
