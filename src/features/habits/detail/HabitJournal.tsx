import { NotePencil, Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { MOOD_LABEL, MOOD_SWATCH } from '@/features/mood/lib/levels'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/date'
import { notesOf } from '@/lib/habitInsights'
import { cellState, type CellState, type LogIndex } from '@/lib/habits'
import type { Habit, HabitLog, MoodEntry } from '@/types/domain'
import { HABIT_STYLE } from '../habitUi'
import { statusText } from './statusText'

interface HabitJournalProps {
  habit: Habit
  logs: readonly HabitLog[]
  index: LogIndex
  moods: readonly MoodEntry[]
  today: string
  onWrite: () => void
  onOpen: (date: string) => void
}

const BADGE: Partial<Record<CellState, string>> = {
  missed: 'bg-sunken text-muted',
  off: 'bg-sunken text-muted',
  open: 'bg-sunken text-muted',
}

/** What the person wrote about this habit, newest day first, each beside whether the day went well. */
export function HabitJournal({ habit, logs, index, moods, today, onWrite, onOpen }: HabitJournalProps) {
  const entries = notesOf(logs, habit.id)
  const style = HABIT_STYLE[habit.color]

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={NotePencil}
        title="Belum ada catatan"
        description="Tulis apa yang membantu atau menghalangi. Setelah beberapa catatan, pola dari hari-hari yang lancar dan yang terlewat mulai kelihatan."
        action={
          <Button variant="primary" onClick={onWrite}>
            <Plus weight="bold" aria-hidden />
            Tulis catatan
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          <span className="tabular-nums">{entries.length}</span> catatan
        </p>
        <Button variant="primary" onClick={onWrite}>
          <Plus weight="bold" aria-hidden />
          Tulis catatan
        </Button>
      </div>
      <ol className="space-y-2">
        {entries.map((entry) => {
          const state = cellState(habit, index, entry.date, today)
          const mood = moods.find((m) => m.date === entry.date)
          return (
            <li key={entry.id} className="rounded-card border bg-surface p-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h3 className="text-sm font-medium">{fmt(entry.date, 'EEEE, d MMMM yyyy')}</h3>
                <span className={cn('rounded-chip px-2 py-0.5 text-xs font-medium', BADGE[state] ?? cn(style.tint, style.text))}>{statusText(habit, index, entry.date, state)}</span>
                {mood && (
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <span aria-hidden className={cn('size-2.5 rounded-full', MOOD_SWATCH[mood.level])} />
                    {MOOD_LABEL[mood.level]}
                  </span>
                )}
                <Button variant="ghost" onClick={() => onOpen(entry.date)} aria-label={`Ubah catatan ${fmt(entry.date, 'd MMMM yyyy')}`} className="ml-auto h-7 px-2 text-xs">
                  Ubah
                </Button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{entry.note}</p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
