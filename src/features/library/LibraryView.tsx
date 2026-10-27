import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Books, FilmSlate, BookOpenText, MagnifyingGlass } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, panelId, tabId, type TabItem } from '@/components/ui/Tabs'
import {
  DEFAULT_FILTERS,
  applyFilters,
  filtersToParams,
  genresOf,
  inProgress,
  isNarrowed,
  parseFilters,
  sortItems,
  summarize,
  type LibraryFilters,
  type LibraryTab,
} from '@/lib/library'
import { useLibraryItemStore } from '@/stores/entities'
import type { LibraryKind } from '@/types/domain'
import { ContinueRail } from './shelf/ContinueRail'
import { FilterBar } from './shelf/FilterBar'
import { LibraryCard } from './shelf/LibraryCard'
import { LibraryList } from './shelf/LibraryList'
import { StatsStrip } from './shelf/StatsStrip'

const PREFIX = 'library'

export function LibraryViewSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-9 w-full" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="aspect-[2/3] w-full" />
        ))}
      </div>
    </div>
  )
}

/** Typing in a field, a dialog, or on a menu is not a shortcut. */
const typingIn = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  return Boolean(el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.closest('dialog[open], [role="menu"]')))
}

export function LibraryView({ onAdd }: { onAdd: (kind?: LibraryKind) => void }) {
  const items = useLibraryItemStore((s) => s.items)
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(params), [params])
  const update = (patch: Partial<LibraryFilters>) => setParams(filtersToParams({ ...filters, ...patch }), { replace: true })

  // "/" to search and "n" to add, the same two keys wherever the page is used.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typingIn(e.target)) return
      if (e.key === '/') {
        e.preventDefault()
        document.getElementById('library-search')?.focus()
      } else if (e.key === 'n') {
        e.preventDefault()
        onAdd(filters.tab === 'buku' ? 'buku' : 'film')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onAdd, filters.tab])

  const visible = useMemo(() => sortItems(applyFilters(items, filters), filters.sort), [items, filters])
  const genres = useMemo(() => genresOf(items), [items])
  const counts = useMemo(() => ({ semua: items.length, film: items.filter((i) => i.kind === 'film').length, buku: items.filter((i) => i.kind === 'buku').length }), [items])
  const rail = useMemo(() => inProgress(items).filter((i) => filters.tab === 'semua' || i.kind === filters.tab), [items, filters.tab])
  const year = new Date().getFullYear()
  const summary = useMemo(() => summarize(items, year), [items, year])

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Books}
        title="Library masih kosong"
        description="Catat film yang sudah ditonton dan buku yang sedang dibaca, lengkap dengan rating dan ulasanmu."
        action={
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => onAdd('film')}>
              <FilmSlate aria-hidden />
              Tambah film
            </Button>
            <Button onClick={() => onAdd('buku')}>
              <BookOpenText aria-hidden />
              Tambah buku
            </Button>
          </div>
        }
      />
    )
  }

  const tabs: TabItem<LibraryTab>[] = [
    { value: 'semua', label: 'Semua', count: counts.semua },
    { value: 'film', label: 'Film', count: counts.film },
    { value: 'buku', label: 'Buku', count: counts.buku },
  ]

  return (
    <div className="space-y-5">
      <StatsStrip summary={summary} year={year} />
      <Tabs items={tabs} value={filters.tab} onChange={(tab) => update({ tab })} label="Jenis" idPrefix={PREFIX} />
      <div role="tabpanel" id={panelId(PREFIX, filters.tab)} aria-labelledby={tabId(PREFIX, filters.tab)} className="space-y-5">
        {!isNarrowed(filters) && <ContinueRail items={rail} />}
        <FilterBar filters={filters} genres={genres} onChange={update} onReset={() => update({ ...DEFAULT_FILTERS, tab: filters.tab, sort: filters.sort, view: filters.view })} />
        <p aria-live="polite" className="text-sm text-muted">
          <span className="tabular-nums">{visible.length}</span> {isNarrowed(filters) ? `dari ${items.filter((i) => filters.tab === 'semua' || i.kind === filters.tab).length} ` : ''}item
        </p>

        {visible.length === 0 ? (
          <EmptyState
            icon={MagnifyingGlass}
            title="Tidak ada yang cocok"
            description="Coba kata kunci lain, atau longgarkan filternya."
            action={<Button onClick={() => update({ ...DEFAULT_FILTERS, tab: filters.tab, sort: filters.sort, view: filters.view })}>Hapus filter</Button>}
          />
        ) : filters.view === 'daftar' ? (
          <LibraryList items={visible} />
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {visible.map((item) => (
              <LibraryCard key={item.id} item={item} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
