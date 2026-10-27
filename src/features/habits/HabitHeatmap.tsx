import { addDays, parseISO, startOfWeek } from 'date-fns'
import { WEEK_STARTS_ON } from '@/lib/config'
import { cn } from '@/lib/cn'
import { fmt, toISODate } from '@/lib/date'
import { cellState, rateBetween, type CellState, type LogIndex } from '@/lib/habits'
import type { Habit } from '@/types/domain'
import { HABIT_STYLE } from './habitUi'

const STATE_TEXT: Record<CellState, string> = {
  done: 'selesai',
  partial: 'sebagian',
  missed: 'terlewat',
  off: 'bukan hari terjadwal',
  open: 'belum selesai',
  future: '',
}

interface HabitHeatmapProps {
  habit: Habit
  index: LogIndex
  today: string
  weeks?: number
}

/** The last `weeks` weeks as columns, Monday at the top, the way a contribution graph reads. One picture with one summary. */
export function HabitHeatmap({ habit, index, today, weeks = 12 }: HabitHeatmapProps) {
  const style = HABIT_STYLE[habit.color]
  const first = toISODate(addDays(startOfWeek(parseISO(today), { weekStartsOn: WEEK_STARTS_ON }), -(weeks - 1) * 7))
  const dates = Array.from({ length: weeks * 7 }, (_, i) => toISODate(addDays(parseISO(first), i)))
  const { done, scheduled } = rateBetween(habit, index, first, today, today)

  return (
    <div>
      <div
        role="img"
        aria-label={`Riwayat ${weeks} minggu terakhir untuk ${habit.name}: ${done} dari ${scheduled} hari terjadwal selesai.`}
        className="grid auto-cols-fr grid-flow-col grid-rows-7 gap-[3px]"
      >
        {dates.map((date) => {
          const state = cellState(habit, index, date, today)
          return (
            <span
              key={date}
              title={state === 'future' ? undefined : `${fmt(date, 'EEE d MMM')}: ${STATE_TEXT[state]}`}
              className={cn(
                'aspect-square rounded-[3px]',
                state === 'done' && style.solid,
                state === 'partial' && style.tint,
                state === 'missed' && 'bg-sunken',
                state === 'open' && 'border border-dashed border-faint',
                state === 'off' && 'bg-sunken/40',
                state === 'future' && 'invisible',
              )}
            />
          )
        })}
      </div>
      <ul aria-hidden className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
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
      </ul>
    </div>
  )
}
