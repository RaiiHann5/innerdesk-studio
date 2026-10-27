import { Check, Minus, Plus } from '@phosphor-icons/react'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'
import { isComplete, isCounted, isScheduled, valueOn, type LogIndex } from '@/lib/habits'
import type { Habit } from '@/types/domain'
import { stepFor, stepHabit, toggleHabitDay } from './habitActions'
import { HABIT_STYLE } from './habitUi'

interface TodayControlProps {
  habit: Habit
  index: LogIndex
  date: string
  /** What to say when the habit is not due that day. */
  offLabel?: string
}

/**
 * What the person taps to record a day: a check for a plain habit, and for a counted one a stepper with the check
 * as a shortcut to the full target. A habit that is not due that day shows a word instead, not a dead button.
 */
export function TodayControl({ habit, index, date, offLabel = 'Bukan hari ini' }: TodayControlProps) {
  if (!isScheduled(habit, date)) return <span className="text-xs text-muted">{offLabel}</span>

  const value = valueOn(index, habit.id, date)
  const done = isComplete(habit, value)
  const step = stepFor(habit)

  return (
    <div className="flex items-center gap-1.5">
      {isCounted(habit) && (
        <>
          <IconButton icon={Minus} label={`Kurangi ${habit.name}`} disabled={value <= 0} onClick={() => void stepHabit(habit, date, -step)} className="border disabled:opacity-40" />
          <span role="status" aria-label={`${habit.name}: ${value} dari ${habit.target}${habit.unit ? ` ${habit.unit}` : ''}`} className="min-w-14 text-center text-sm tabular-nums">
            <span className="font-bold">{value}</span>
            <span className="text-muted">/{habit.target}</span>
            {habit.unit && <span className="block text-xs leading-3 text-muted">{habit.unit}</span>}
          </span>
          <IconButton icon={Plus} label={`Tambah ${habit.name}`} onClick={() => void stepHabit(habit, date, step)} className="border" />
        </>
      )}
      <button
        type="button"
        aria-pressed={done}
        aria-label={done ? `Batalkan ${habit.name}` : `Selesaikan ${habit.name}`}
        title={done ? 'Batalkan' : 'Tandai selesai'}
        onClick={() => void toggleHabitDay(habit, date)}
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-full border-2 transition-colors duration-fast',
          done ? cn(HABIT_STYLE[habit.color].solid, 'border-transparent text-surface') : 'border-faint text-transparent hover:border-ink hover:text-faint',
        )}
      >
        <Check size={18} weight="bold" aria-hidden />
      </button>
    </div>
  )
}
