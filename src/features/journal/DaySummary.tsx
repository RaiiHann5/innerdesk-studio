import { Check, Fire } from '@phosphor-icons/react'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/cn'
import { MoodFace } from '@/features/mood/MoodFace'
import { MOOD_LABEL } from '@/features/mood/lib/levels'
import type { JournalEntry, MoodEntry } from '@/types/domain'
import { PARTS, doneCount, partsDone, percentDone, writingWords } from './lib/progress'

interface DaySummaryProps {
  mood: MoodEntry | undefined
  entry: JournalEntry | undefined
  streak: number
}

const jumpTo = (id: string) => {
  const el = document.getElementById(`part-${id}`)
  el?.scrollIntoView({ block: 'start', behavior: 'smooth' })
}

/** The open day in one card: mood, how many parts are filled, and a shortcut to each. Reads the saved entry, so it follows autosave. */
export function DaySummary({ mood, entry, streak }: DaySummaryProps) {
  const parts = partsDone(mood, entry)
  const done = doneCount(parts)
  const gratitudeCount = entry?.gratitude?.length ?? 0

  return (
    <section aria-labelledby="summary-title" className="rounded-card border bg-surface p-4">
      <h2 id="summary-title" className="text-xs font-medium text-muted">
        Ringkasan hari ini
      </h2>

      <div className="mt-3 flex items-center gap-3 rounded-control bg-sunken p-3">
        <MoodFace level={mood?.level ?? null} size={40} />
        <div className="min-w-0">
          <p className="truncate font-display text-md font-bold leading-5">{mood ? MOOD_LABEL[mood.level] : 'Mood belum diisi'}</p>
          <p className="text-xs text-muted">{gratitudeCount} hal disyukuri</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between text-xs text-muted">
          <span>Progres jurnal</span>
          <span className="tabular-nums">
            <span className="font-display text-base font-bold text-ink">{done}</span> / {PARTS.length} bagian
          </span>
        </div>
        <ProgressBar value={percentDone(parts)} label="Progres jurnal hari ini" className="h-1.5 bg-line" />
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-1.5">
        {PARTS.map(({ id, label }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => jumpTo(id)}
              className={cn(
                'flex h-8 w-full items-center gap-2 rounded-control px-2.5 text-sm transition-colors duration-fast',
                parts[id] ? 'bg-ink text-bg' : 'bg-sunken text-muted hover:text-ink',
              )}
            >
              {parts[id] ? <Check size={12} weight="bold" aria-hidden /> : <span aria-hidden className="size-3 rounded-full border border-dashed border-faint" />}
              {label}
              <span className="sr-only">{parts[id] ? ', sudah diisi' : ', belum diisi'}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted">
        <span className="tabular-nums">{writingWords(entry)} kata ditulis</span>
        {streak > 0 && (
          <span className="flex items-center gap-1 font-medium text-accent-text">
            <Fire size={14} weight="fill" aria-hidden />
            {streak} hari beruntun
          </span>
        )}
      </div>
    </section>
  )
}
