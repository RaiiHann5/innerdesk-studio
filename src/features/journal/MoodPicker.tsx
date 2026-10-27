import { Check } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { FactorChips } from '@/features/mood/FactorChips'
import { MoodFace } from '@/features/mood/MoodFace'
import { MOOD_LABEL, MOOD_LEVELS } from '@/features/mood/lib/levels'
import { useMoodActions } from '@/features/mood/hooks/useMoodActions'
import type { MoodEntry, MoodFactor, MoodLevel } from '@/types/domain'

interface MoodPickerProps {
  date: string
  entry: MoodEntry | undefined
}

/**
 * Today's mood in one tap: it saves straight away, since a single choice has nothing to review first.
 * Tapping the chosen face again clears it, with the usual undo. The factors only open once there is a mood to attach them to.
 */
export function MoodPicker({ date, entry }: MoodPickerProps) {
  const { save, remove } = useMoodActions()

  const choose = (level: MoodLevel) => {
    if (entry?.level === level) void remove(entry)
    else void save({ date, level, factors: entry?.factors ?? [], note: entry?.note })
  }
  const setFactors = (factors: MoodFactor[]) => {
    if (entry) void save({ date, level: entry.level, factors, note: entry.note })
  }

  return (
    <div>
      <div role="group" aria-label="Suasana hati, dari berat sampai sangat baik" className="grid grid-cols-5 gap-2 md:gap-3">
        {MOOD_LEVELS.map((level) => {
          const selected = entry?.level === level
          return (
            <button
              key={level}
              type="button"
              aria-pressed={selected}
              onClick={() => choose(level)}
              className={cn(
                'group relative flex flex-col items-center gap-2 rounded-card border px-1 pb-3 pt-4 transition-colors duration-fast',
                selected ? 'border-ink bg-sunken' : 'hover:border-faint hover:bg-sunken',
              )}
            >
              <MoodFace
                level={level}
                size={52}
                className={cn('transition-transform duration-base', selected ? 'scale-110' : 'group-hover:-translate-y-0.5', entry && !selected && 'opacity-60 group-hover:opacity-100')}
              />
              <span className={cn('text-xs leading-tight', selected ? 'font-semibold text-ink' : 'font-medium text-muted')}>{MOOD_LABEL[level]}</span>
              {selected && (
                <span aria-hidden className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-ink text-bg">
                  <Check size={10} weight="bold" />
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-sm font-medium">
          Apa yang ikut berperan? <span className="font-normal text-muted">{entry ? '(opsional)' : '(pilih mood dulu)'}</span>
        </p>
        <div className={cn(!entry && 'pointer-events-none opacity-50')} aria-disabled={!entry}>
          <FactorChips value={entry?.factors ?? []} onChange={setFactors} />
        </div>
      </div>
    </div>
  )
}
