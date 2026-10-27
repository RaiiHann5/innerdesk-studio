import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { RATING_MAX, STATUSES, STATUS_SHORT, isNarrowed, type LibraryFilters, type LibrarySort, type LibraryView, type StatusFilter } from '@/lib/library'

interface FilterBarProps {
  filters: LibraryFilters
  genres: string[]
  onChange: (patch: Partial<LibraryFilters>) => void
  onReset: () => void
}

const SORTS: Array<{ value: LibrarySort; label: string }> = [
  { value: 'terbaru', label: 'Terbaru' },
  { value: 'judul', label: 'Judul A-Z' },
  { value: 'rating', label: 'Rating tertinggi' },
  { value: 'tahun', label: 'Tahun terbaru' },
]

export function FilterBar({ filters, genres, onChange, onReset }: FilterBarProps) {
  const statuses: Array<{ value: StatusFilter; label: string }> = [{ value: 'semua', label: 'Semua' }, ...STATUSES.map((value) => ({ value, label: STATUS_SHORT[value] }))]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <MagnifyingGlass aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="library-search"
            type="search"
            value={filters.q}
            onChange={(e) => onChange({ q: e.target.value })}
            placeholder="Cari judul, sutradara, penulis, pemeran"
            aria-label="Cari di Library"
            aria-keyshortcuts="/"
            className={cn(controlClass, 'pl-8')}
          />
        </div>
        <SegmentedControl<LibraryView>
          label="Tampilan"
          value={filters.view}
          onChange={(view) => onChange({ view })}
          options={[
            { value: 'rak', label: 'Rak' },
            { value: 'daftar', label: 'Daftar' },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div role="group" aria-label="Status" className="flex flex-wrap gap-1">
          {statuses.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-pressed={filters.status === s.value}
              onClick={() => onChange({ status: s.value })}
              className={cn(
                'h-7 rounded-chip border px-2.5 text-sm transition-colors duration-fast',
                filters.status === s.value ? 'border-transparent bg-accent-soft font-medium text-accent-text' : 'text-muted hover:border-faint hover:text-ink',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1.5 text-sm text-muted">
          Genre
          <select value={filters.genre} onChange={(e) => onChange({ genre: e.target.value })} className={cn(controlClass, 'h-7 w-auto py-0 text-sm')}>
            <option value="">Semua</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5 text-sm text-muted">
          Rating
          <select value={filters.minRating} onChange={(e) => onChange({ minRating: Number(e.target.value) })} className={cn(controlClass, 'h-7 w-auto py-0 text-sm')}>
            <option value={0}>Semua</option>
            {Array.from({ length: RATING_MAX / 2 }, (_, i) => (i + 1) * 2).reverse().map((r) => (
              <option key={r} value={r}>
                {r / 2} bintang ke atas
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5 text-sm text-muted">
          Urut
          <select value={filters.sort} onChange={(e) => onChange({ sort: e.target.value as LibrarySort })} className={cn(controlClass, 'h-7 w-auto py-0 text-sm')}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        {isNarrowed(filters) && (
          <Button variant="ghost" onClick={onReset} className="h-7 px-2 text-sm">
            <X aria-hidden />
            Hapus filter
          </Button>
        )}
      </div>
    </div>
  )
}
