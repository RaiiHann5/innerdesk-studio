import { PencilSimple, Trash } from '@phosphor-icons/react'
import { IconButton } from '@/components/ui/IconButton'
import { fmt } from '@/lib/date'
import type { MoodEntry } from '@/types/domain'
import { MoodLevelChip } from './MoodLevelChip'
import { FACTOR_BY_ID } from './lib/levels'

interface MoodEntryCardProps {
  entry: MoodEntry
  /** Without these the card is read-only, as on the dashboard. */
  onEdit?: (entry: MoodEntry) => void
  onDelete?: (entry: MoodEntry) => void
}

export function MoodEntryCard({ entry, onEdit, onDelete }: MoodEntryCardProps) {
  const day = fmt(entry.date, 'd MMMM')
  return (
    <article className="flex gap-4 rounded-card border bg-surface p-3 md:p-4">
      <time dateTime={entry.date} className="w-12 shrink-0 text-center">
        <span className="block font-display text-lg font-bold tabular-nums">{fmt(entry.date, 'd')}</span>
        <span className="block text-xs text-muted">{fmt(entry.date, 'MMM')}</span>
      </time>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex flex-wrap items-baseline gap-x-3 text-sm">
            <span className="font-medium">{fmt(entry.date, 'EEEE')}</span>
            <MoodLevelChip level={entry.level} />
          </h3>
          {(onEdit || onDelete) && (
            <div className="-my-1 -mr-1 flex">
              {onEdit && <IconButton icon={PencilSimple} label={`Ubah catatan ${day}`} onClick={() => onEdit(entry)} />}
              {onDelete && <IconButton icon={Trash} label={`Hapus catatan ${day}`} onClick={() => onDelete(entry)} />}
            </div>
          )}
        </div>
        {entry.note && <p className="mt-1.5 text-sm">{entry.note}</p>}
        {entry.factors.length > 0 && (
          <ul aria-label="Faktor" className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            {entry.factors.map((id) => {
              const { label, icon: IconComponent } = FACTOR_BY_ID[id]
              return (
                <li key={id} className="flex items-center gap-1.5">
                  <IconComponent size={14} aria-hidden />
                  {label}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </article>
  )
}
