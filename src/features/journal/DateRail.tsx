import { useEffect, useMemo, useRef, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/date'
import type { JournalEntry } from '@/types/domain'
import { buildRailMonths, groupEntriesByMonth, searchEntries } from './lib/dateRail'

interface DateRailProps {
  entries: JournalEntry[]
  today: string
  selected: string
  onSelect: (date: string) => void
}

const titleOf = (entry: JournalEntry) => entry.title?.trim() || entry.excerpt

interface RowProps {
  date: string
  entry?: JournalEntry
  selected: boolean
  onSelect: (date: string) => void
  /** Search results show the excerpt under the title; the plain list stays one line. */
  detailed?: boolean
}

function Row({ date, entry, selected, onSelect, detailed }: RowProps) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  return (
    <button
      ref={ref}
      type="button"
      aria-current={selected ? 'date' : undefined}
      onClick={() => onSelect(date)}
      className={cn(
        'flex w-full items-start gap-3 rounded-control px-2 py-1.5 text-left transition-colors duration-fast',
        selected ? 'bg-accent-soft text-accent-text' : 'hover:bg-sunken',
      )}
    >
      <time dateTime={date} className="w-9 shrink-0 text-center">
        <span className="block font-display text-md font-bold tabular-nums leading-5">{fmt(date, 'd')}</span>
        <span className="block text-xs text-muted">{fmt(date, 'EEE')}</span>
      </time>
      <span className="min-w-0 flex-1 self-center">
        {entry ? (
          <>
            <span className={cn('block truncate text-sm', selected ? 'font-medium' : 'text-ink')}>{titleOf(entry)}</span>
            {detailed && entry.title && <span className="block truncate text-xs text-muted">{entry.excerpt}</span>}
          </>
        ) : (
          <span className="block text-sm text-muted">Kosong</span>
        )}
      </span>
      {entry && (
        <>
          <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
          <span className="sr-only">Ada catatan</span>
        </>
      )}
    </button>
  )
}

export function DateRail({ entries, today, selected, onSelect }: DateRailProps) {
  const [query, setQuery] = useState('')
  const searching = query.trim() !== ''
  const months = useMemo(() => buildRailMonths(entries, today), [entries, today])
  const results = useMemo(() => (searching ? searchEntries(entries, query) : []), [entries, query, searching])
  const resultGroups = useMemo(() => groupEntriesByMonth(results), [results])

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="journal-search" className="sr-only">
            Cari di jurnal
          </label>
          <MagnifyingGlass size={14} aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="journal-search"
            type="search"
            value={query}
            placeholder="Cari di jurnal"
            onChange={(e) => setQuery(e.target.value)}
            className={cn(controlClass, 'pl-8')}
          />
        </div>
        <Button onClick={() => onSelect(today)} disabled={selected === today && !searching}>
          Hari ini
        </Button>
      </div>

      <nav aria-label="Daftar tanggal jurnal" className="min-h-0 flex-1 overflow-y-auto pr-1">
        {searching ? (
          <div>
            <p role="status" className="px-2 pb-2 text-xs text-muted">
              {results.length === 0 ? `Tidak ada catatan yang cocok dengan “${query.trim()}”.` : `${results.length} catatan ditemukan`}
            </p>
            {resultGroups.map((group) => (
              <section key={group.key} aria-label={group.label} className="mb-3">
                <h3 className="px-2 pb-1 text-xs font-medium text-muted">{group.label}</h3>
                <ul className="space-y-0.5">
                  {group.entries.map((entry) => (
                    <li key={entry.id}>
                      <Row date={entry.date} entry={entry} selected={entry.date === selected} onSelect={onSelect} detailed />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <>
            {entries.length === 0 && <p className="px-2 pb-3 text-sm text-muted">Belum ada catatan. Pilih hari ini dan mulai menulis.</p>}
            {months.map((month) => (
              <section key={month.key} aria-label={month.label} className="mb-3">
                <h3 className="sticky top-0 bg-surface px-2 pb-1 text-xs font-medium text-muted">{month.label}</h3>
                <ul className="space-y-0.5">
                  {month.days.map(({ date, entry }) => (
                    <li key={date}>
                      <Row date={date} entry={entry} selected={date === selected} onSelect={onSelect} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </nav>
    </div>
  )
}
