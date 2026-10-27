import { Barbell, Moon } from '@phosphor-icons/react'
import { fmt } from '@/lib/date'
import type { MoodEntry } from '@/types/domain'
import { MOOD_LABEL, MoodScale } from './MoodScale'

export function MoodCard({ entry }: { entry: MoodEntry }) {
  return (
    <article className="rounded-card border bg-surface p-3">
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-ui text-sm font-medium">{fmt(entry.date, 'EEEE, d MMM')}</h3>
        <span className="text-xs text-muted">{MOOD_LABEL[entry.score]}</span>
      </header>
      <div className="mt-2">
        <MoodScale value={entry.score} />
      </div>
      {entry.note && <p className="mt-2 text-sm text-muted">{entry.note}</p>}
      {(entry.sleepHours !== undefined || entry.exercised) && (
        <ul className="mt-2 flex flex-wrap gap-3 text-xs text-muted" aria-label="Faktor">
          {entry.sleepHours !== undefined && (
            <li className="flex items-center gap-1.5 tabular-nums">
              <Moon size={14} aria-hidden />
              Tidur {entry.sleepHours.toLocaleString('id-ID')} jam
            </li>
          )}
          {entry.exercised && (
            <li className="flex items-center gap-1.5">
              <Barbell size={14} aria-hidden />
              Olahraga
            </li>
          )}
        </ul>
      )}
    </article>
  )
}
