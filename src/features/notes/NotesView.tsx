import { useMemo } from 'react'
import { NotePencil, Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, panelId, tabId } from '@/components/ui/Tabs'
import { useNotes } from './hooks/useNotes'
import { TAB_ITEMS, type NoteTab } from './lib/arrange'
import { focusFirstNote, NoteGrid, NoteGridSkeleton } from './NoteGrid'
import { NotesEmpty } from './NotesEmpty'
import { NotesToolbar } from './NotesToolbar'
import { useNoteFilters } from './store'

const TABS_ID = 'notes'

interface NotesViewProps {
  creating: boolean
  onCreate: () => void
}

export function NotesViewSkeleton() {
  return (
    <div role="status" aria-label="Memuat catatan" className="space-y-5">
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="size-9" />
      </div>
      <Skeleton className="h-10 w-72" />
      <NoteGridSkeleton />
    </div>
  )
}

/** The main notes view: toolbar, tabs and the card grid. Writing happens on the note's own page. */
export function NotesView({ creating, onCreate }: NotesViewProps) {
  const { hasAny, tab, tags, activeTag, visible, counts, pending } = useNotes()
  const query = useNoteFilters((s) => s.query)
  const setTab = useNoteFilters((s) => s.setTab)
  const clearFilters = useNoteFilters((s) => s.clearFilters)

  const items = useMemo(() => TAB_ITEMS.map((item) => ({ ...item, count: counts[item.value] })), [counts])

  const createButton = (
    <Button variant="primary" onClick={onCreate} disabled={creating}>
      <Plus weight="bold" aria-hidden />
      Catatan baru
    </Button>
  )

  if (!hasAny) {
    return (
      <EmptyState
        icon={NotePencil}
        title="Belum ada catatan"
        description="Tulis ide, keputusan, atau hasil rapat di sini supaya mudah ditemukan lagi."
        action={createButton}
      />
    )
  }

  return (
    <div className="space-y-5" aria-busy={pending}>
      <NotesToolbar tags={tags} activeTag={activeTag} onArrowDown={focusFirstNote} />
      <Tabs items={items} value={tab} onChange={(value: NoteTab) => setTab(value)} label="Kelompok catatan" idPrefix={TABS_ID} tone="neutral" />
      <div role="tabpanel" id={panelId(TABS_ID, tab)} aria-labelledby={tabId(TABS_ID, tab)}>
        {visible.length === 0 ? (
          <NotesEmpty tab={tab} query={query} tag={activeTag} onClearFilters={clearFilters} createButton={createButton} />
        ) : (
          <NoteGrid notes={visible} pending={pending} />
        )}
      </div>
    </div>
  )
}
