import { useRef, type KeyboardEvent } from 'react'
import { MagnifyingGlass, NotePencil, Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/cn'
import { useNotes } from './hooks/useNotes'
import { SORT_OPTIONS, type NoteSort } from './lib/arrange'
import { NoteCard } from './NoteCard'
import { NoteSearch } from './NoteSearch'
import { useNoteFilters } from './store'
import { TagFilter } from './TagFilter'
import type { Note } from '@/types/domain'

interface GroupProps {
  label: string
  heading?: string
  notes: Note[]
  selectedId?: string
}

function Group({ label, heading, notes, selectedId }: GroupProps) {
  if (notes.length === 0) return null
  return (
    <section aria-label={label} className="space-y-2">
      {heading && (
        <h2 aria-hidden className="font-ui text-xs font-medium text-muted">
          {heading}
        </h2>
      )}
      <ul className="space-y-2">
        {notes.map((note) => (
          <li key={note.id}>
            <NoteCard note={note} to={`/notes/${note.id}`} selected={note.id === selectedId} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export function NoteListSkeleton() {
  return (
    <div role="status" aria-label="Memuat catatan" className="max-w-2xl space-y-3">
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-7 w-64" />
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-[104px] rounded-card" />
      ))}
    </div>
  )
}

export function NoteList({ selectedId }: { selectedId?: string }) {
  const { total, tags, activeTag, groups, pending, creating, create } = useNotes()
  const query = useNoteFilters((s) => s.query)
  const sort = useNoteFilters((s) => s.sort)
  const setTag = useNoteFilters((s) => s.setTag)
  const setSort = useNoteFilters((s) => s.setSort)
  const clearFilters = useNoteFilters((s) => s.clearFilters)
  const listRef = useRef<HTMLDivElement>(null)

  const createButton = (
    <Button variant="primary" onClick={() => void create()} disabled={creating} className="shrink-0">
      <Plus weight="bold" aria-hidden />
      Catatan baru
    </Button>
  )

  if (total === 0) {
    return (
      <div className="max-w-2xl">
        <EmptyState
          icon={NotePencil}
          title="Belum ada catatan"
          description="Tulis ide, keputusan, atau hasil rapat di sini supaya mudah ditemukan lagi."
          action={createButton}
        />
      </div>
    )
  }

  const visible = groups.pinned.length + groups.rest.length
  const rows = () => Array.from(listRef.current?.querySelectorAll<HTMLAnchorElement>('a[data-note-link]') ?? [])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const links = rows()
    const index = links.indexOf(document.activeElement as HTMLAnchorElement)
    if (index === -1) return
    const target = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: links.length - 1 }[e.key]
    if (target === undefined) return
    e.preventDefault()
    links[Math.min(Math.max(target, 0), links.length - 1)].focus()
  }

  return (
    <div className="max-w-2xl space-y-3" aria-busy={pending}>
      <div className="flex items-center gap-2">
        <NoteSearch onArrowDown={() => rows()[0]?.focus()} />
        {createButton}
      </div>
      <TagFilter tags={tags} value={activeTag} onChange={setTag} />
      <div className="flex items-center justify-between gap-3">
        <p role="status" className="text-sm tabular-nums text-muted">
          {visible} catatan
        </p>
        <label className="flex items-center gap-2 text-sm text-muted">
          Urutkan
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as NoteSort)}
            className="h-8 rounded-control border bg-surface px-2 text-sm text-ink transition-colors duration-fast hover:border-faint"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visible === 0 ? (
        <EmptyState
          icon={MagnifyingGlass}
          title="Catatan tidak ditemukan"
          description={query.trim() ? `Tidak ada catatan yang cocok dengan “${query.trim()}”.` : `Belum ada catatan dengan tag ${activeTag}.`}
          action={
            <Button onClick={clearFilters}>
              Hapus filter
            </Button>
          }
        />
      ) : (
        <div ref={listRef} onKeyDown={onKeyDown} className={cn('space-y-4 transition-opacity duration-fast', pending && 'opacity-60')}>
          <Group label="Catatan disematkan" heading="Disematkan" notes={groups.pinned} selectedId={selectedId} />
          <Group label="Catatan lainnya" heading={groups.pinned.length > 0 ? 'Lainnya' : undefined} notes={groups.rest} selectedId={selectedId} />
        </div>
      )}
    </div>
  )
}
