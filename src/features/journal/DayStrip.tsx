import { useEffect, useState } from 'react'
import { addDays, parseISO, startOfWeek } from 'date-fns'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'
import { fmt, toISODate } from '@/lib/date'
import type { MoodEntry } from '@/types/domain'
import { MoodFace } from '@/features/mood/MoodFace'
import { MOOD_LABEL } from '@/features/mood/lib/levels'

const WEEK = { weekStartsOn: 1 } as const
const weekOf = (date: string) => toISODate(startOfWeek(parseISO(date), WEEK))

interface DayStripProps {
  selected: string
  today: string
  /** Days that have written entries, for the small mark under the date. */
  written: ReadonlySet<string>
  moods: ReadonlyMap<string, MoodEntry>
  onSelect: (date: string) => void
}

/** The week around the open day, Monday first. Each day shows its mood face, so the week reads at a glance. */
export function DayStrip({ selected, today, written, moods, onSelect }: DayStripProps) {
  const [start, setStart] = useState(() => weekOf(selected))
  // Jumping to a day outside the shown week (from the history list, say) brings its week along.
  useEffect(() => setStart((current) => (selected >= current && selected < toISODate(addDays(parseISO(current), 7)) ? current : weekOf(selected))), [selected])

  const days = Array.from({ length: 7 }, (_, i) => toISODate(addDays(parseISO(start), i)))
  const isCurrentWeek = start === weekOf(today)
  const shift = (by: number) => setStart(toISODate(addDays(parseISO(start), by * 7)))

  return (
    <div className="flex items-center gap-2">
      <IconButton icon={CaretLeft} label="Pekan sebelumnya" onClick={() => shift(-1)} />
      <ol aria-label="Pilih hari" className="grid min-w-0 flex-1 grid-cols-7 gap-1.5">
        {days.map((date) => {
          const mood = moods.get(date)
          const future = date > today
          const isSelected = date === selected
          return (
            <li key={date}>
              <button
                type="button"
                disabled={future}
                aria-current={isSelected ? 'date' : undefined}
                aria-label={`${fmt(date, 'EEEE, d MMMM')}${mood ? `, mood ${MOOD_LABEL[mood.level].toLowerCase()}` : ''}${written.has(date) ? ', ada catatan' : ''}`}
                onClick={() => onSelect(date)}
                className={cn(
                  'group flex w-full flex-col items-center gap-1 rounded-card border px-1 pb-2 pt-2 transition-colors duration-fast disabled:opacity-40',
                  isSelected ? 'border-ink bg-ink text-bg' : 'bg-surface hover:border-faint hover:bg-sunken disabled:hover:bg-surface',
                )}
              >
                <span className={cn('text-xs', isSelected ? 'text-bg/70' : 'text-muted')}>{fmt(date, 'EEE')}</span>
                <span className="font-display text-md font-bold tabular-nums leading-5">{fmt(date, 'd')}</span>
                <MoodFace level={mood?.level ?? null} size={26} className={cn(!mood && isSelected && '[&_circle]:stroke-bg/50')} />
                <span aria-hidden className={cn('h-1 w-1 rounded-full', written.has(date) ? (isSelected ? 'bg-bg' : 'bg-accent') : 'bg-transparent')} />
              </button>
            </li>
          )
        })}
      </ol>
      <IconButton icon={CaretRight} label="Pekan berikutnya" disabled={isCurrentWeek || start > today} onClick={() => shift(1)} className="disabled:opacity-40" />
      <Button onClick={() => onSelect(today)} disabled={selected === today} className="hidden sm:inline-flex">
        Hari ini
      </Button>
    </div>
  )
}
