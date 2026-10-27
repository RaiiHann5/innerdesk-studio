import { useRef } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { controlClass } from '@/components/ui/Field'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'
import { useNoteFilters } from './store'

interface NoteSearchProps {
  /** Arrow down hands focus to the first note in the grid. */
  onArrowDown: () => void
}

export function NoteSearch({ onArrowDown }: NoteSearchProps) {
  const query = useNoteFilters((s) => s.query)
  const setQuery = useNoteFilters((s) => s.setQuery)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="relative min-w-0 flex-1">
      <MagnifyingGlass aria-hidden size={16} className="pointer-events-none absolute left-3 top-2.5 text-muted" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            onArrowDown()
          } else if (e.key === 'Escape' && query) {
            e.preventDefault()
            setQuery('')
          }
        }}
        aria-label="Cari catatan"
        placeholder="Cari judul, ringkasan, atau tag"
        className={cn(controlClass, 'h-9 pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden')}
      />
      {query && (
        <IconButton
          icon={X}
          label="Hapus pencarian"
          onClick={() => {
            setQuery('')
            inputRef.current?.focus()
          }}
          className="absolute right-0.5 top-0.5 size-8"
        />
      )}
    </div>
  )
}
