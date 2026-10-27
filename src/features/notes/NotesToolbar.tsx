import { FunnelSimple, X } from '@phosphor-icons/react'
import { IconButton } from '@/components/ui/IconButton'
import { Popover } from '@/components/ui/Popover'
import { cn } from '@/lib/cn'
import { SORT_OPTIONS, type NoteSort } from './lib/arrange'
import { NoteSearch } from './NoteSearch'
import { useNoteFilters } from './store'
import { TagFilter } from './TagFilter'

interface NotesToolbarProps {
  tags: string[]
  activeTag: string | null
  onArrowDown: () => void
}

/** Search, sort and the tag filter in one row, with the active filter shown below as a chip that can be removed. */
export function NotesToolbar({ tags, activeTag, onArrowDown }: NotesToolbarProps) {
  const sort = useNoteFilters((s) => s.sort)
  const setSort = useNoteFilters((s) => s.setSort)
  const setTag = useNoteFilters((s) => s.setTag)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <NoteSearch onArrowDown={onArrowDown} />
        <label className="flex shrink-0 items-center gap-2 text-sm text-muted">
          <span className="hidden sm:inline">Urutkan</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as NoteSort)}
            aria-label="Urutkan catatan"
            className="h-9 rounded-control border bg-surface px-2.5 text-sm text-ink transition-colors duration-fast hover:border-faint"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Popover
          label="Filter tag"
          className="w-72"
          renderTrigger={({ ref, ...props }) => (
            <IconButton
              ref={ref}
              {...props}
              icon={FunnelSimple}
              label="Filter tag"
              className={cn('size-9 border bg-surface text-md', activeTag && 'border-transparent bg-accent-soft text-accent-text hover:bg-accent-soft hover:text-accent-text')}
            />
          )}
        >
          <div className="space-y-2 p-3">
            <p className="text-sm font-medium">Tag</p>
            {tags.length === 0 ? (
              <p className="text-sm text-muted">Belum ada tag di tab ini.</p>
            ) : (
              <TagFilter tags={tags} value={activeTag} onChange={setTag} className="flex-wrap overflow-visible" />
            )}
          </div>
        </Popover>
      </div>

      {activeTag && (
        <ul aria-label="Filter aktif" className="flex flex-wrap gap-2">
          <li>
            <button
              type="button"
              onClick={() => setTag(null)}
              aria-label={`Hapus filter tag ${activeTag}`}
              className="inline-flex h-7 items-center gap-1.5 rounded-control bg-accent-soft pl-2.5 pr-2 text-sm font-medium text-accent-text transition-colors duration-fast hover:bg-accent-soft/70"
            >
              {activeTag}
              <X size={12} weight="bold" aria-hidden />
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
