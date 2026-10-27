import { useEffect, useMemo, useRef, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/date'
import { MoodFace } from '@/features/mood/MoodFace'
import { MOOD_LABEL } from '@/features/mood/lib/levels'
import type { JournalEntry, MoodEntry } from '@/types/domain'
import { buildRailMonths, findEntries, groupEntriesByMonth, tagsInUse } from './lib/dateRail'
import { PARTS, doneCount, partsDone } from './lib/progress'

interface HistoryRailProps {
  entries: JournalEntry[]
  moods: ReadonlyMap<string, MoodEntry>
  today: string
  selected: string
  onSelect: (date: string) => void
}

const titleOf = (entry: JournalEntry) => entry.title?.trim() || entry.excerpt

function Row({ date, entry, mood, selected, onSelect }: { date: string; entry?: JournalEntry; mood?: MoodEntry; selected: boolean; onSelect: (date: string) => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  // Keeps the open day in view inside the list only. `scrollIntoView` would scroll the whole page too,
  // which on a phone threw the reader down to the history as soon as the page opened.
  useEffect(() => {
    const row = ref.current
    const list = row?.closest('nav')
    if (!selected || !row || !list) return
    const rowTop = row.offsetTop - list.offsetTop
    if (rowTop < list.scrollTop) list.scrollTop = rowTop
    else if (rowTop + row.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = rowTop + row.offsetHeight - list.clientHeight
  }, [selected])

  const done = doneCount(partsDone(mood, entry))
  const preview = entry ? titleOf(entry) : mood ? `Mood ${MOOD_LABEL[mood.level].toLowerCase()}` : 'Belum ada catatan'

  return (
    <button
      ref={ref}
      type="button"
      aria-current={selected ? 'date' : undefined}
      onClick={() => onSelect(date)}
      className={cn(
        'flex w-full items-center gap-3 rounded-control border px-2.5 py-2 text-left transition-colors duration-fast',
        selected ? 'border-accent-text/40 bg-accent-soft' : 'border-transparent hover:bg-sunken',
      )}
    >
      <MoodFace level={mood?.level ?? null} size={28} />
      <span className="min-w-0 flex-1">
        <time dateTime={date} className={cn('block text-sm', selected ? 'font-semibold text-accent-text' : 'font-medium')}>
          {fmt(date, 'EEE, d MMM')}
        </time>
        <span className={cn('block truncate text-xs', entry || mood ? 'text-muted' : 'text-faint')}>{preview}</span>
      </span>
      <span
        title={`${done} dari ${PARTS.length} bagian terisi`}
        className={cn('rounded-full border px-2 py-0.5 text-xs tabular-nums', done === PARTS.length ? 'border-ink bg-ink text-bg' : done > 0 ? 'text-ink' : 'text-muted')}
      >
        {done}/{PARTS.length}
      </span>
    </button>
  )
}

/** Past days with a search box and a tag filter. Searching or filtering lists only the days that match. */
export function HistoryRail({ entries, moods, today, selected, onSelect }: HistoryRailProps) {
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('')
  const filtering = query.trim() !== '' || tag !== ''
  const extraDates = useMemo(() => [...moods.keys()], [moods])
  const months = useMemo(() => buildRailMonths(entries, today, extraDates), [entries, today, extraDates])
  const tags = useMemo(() => tagsInUse(entries), [entries])
  const results = useMemo(() => (filtering ? findEntries(entries, query, tag) : []), [entries, query, tag, filtering])
  const resultGroups = useMemo(() => groupEntriesByMonth(results), [results])

  return (
    <section aria-labelledby="history-title" className="flex min-h-0 flex-1 flex-col rounded-card border bg-surface p-4">
      <h2 id="history-title" className="text-xs font-medium text-muted">
        Riwayat
      </h2>

      <div className="mt-3 space-y-2">
        <div className="relative">
          <label htmlFor="journal-search" className="sr-only">
            Cari entri
          </label>
          <MagnifyingGlass size={14} aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input id="journal-search" type="search" value={query} placeholder="Cari entri" onChange={(e) => setQuery(e.target.value)} className={cn(controlClass, 'h-9 pl-8')} />
        </div>
        <label htmlFor="journal-tag" className="sr-only">
          Saring menurut tag
        </label>
        <select id="journal-tag" value={tag} onChange={(e) => setTag(e.target.value)} className={cn(controlClass, 'h-9 cursor-pointer')}>
          <option value="">Semua tag</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <nav aria-label="Riwayat jurnal" className="relative -mr-2 mt-3 max-h-[26rem] min-h-[12rem] flex-1 overflow-y-auto pr-2 lg:max-h-[calc(100dvh-30rem)] lg:min-h-[10rem]">
        {filtering ? (
          <div>
            <p role="status" className="px-1 pb-2 text-xs text-muted">
              {results.length === 0 ? 'Tidak ada catatan yang cocok.' : `${results.length} catatan ditemukan`}
            </p>
            {resultGroups.map((group) => (
              <section key={group.key} aria-label={group.label} className="mb-3">
                <h3 className="px-1 pb-1 text-xs font-medium text-muted">{group.label}</h3>
                <ul className="space-y-0.5">
                  {group.entries.map((entry) => (
                    <li key={entry.id}>
                      <Row date={entry.date} entry={entry} mood={moods.get(entry.date)} selected={entry.date === selected} onSelect={onSelect} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          months.map((month) => (
            <section key={month.key} aria-label={month.label} className="mb-3">
              <h3 className="sticky top-0 z-[1] bg-surface px-1 pb-1 text-xs font-medium text-muted">{month.label}</h3>
              <ul className="space-y-0.5">
                {month.days.map(({ date, entry }) => (
                  <li key={date}>
                    <Row date={date} entry={entry} mood={moods.get(date)} selected={date === selected} onSelect={onSelect} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </nav>
    </section>
  )
}
