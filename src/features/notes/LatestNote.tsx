import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { NotePencil } from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { StoreGate } from '@/components/ui/StoreGate'
import { useNoteStore, useProjectStore } from '@/stores/entities'
import { latestNote } from './lib/arrange'
import { linkButtonClass } from './linkButtonClass'
import { NoteCard } from './NoteCard'

const STORES = [useNoteStore, useProjectStore]

function Latest() {
  const notes = useNoteStore((s) => s.items)
  const note = useMemo(() => latestNote(notes), [notes])

  if (!note) {
    return (
      <EmptyState
        icon={NotePencil}
        title="Belum ada catatan"
        description="Catatan terbaru muncul di sini setelah kamu menulis yang pertama."
        action={
          <Link to="/notes" className={linkButtonClass}>
            Buka catatan
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-3">
      <NoteCard note={note} to={`/notes/${note.id}`} compact />
      <Link to="/notes" className={linkButtonClass}>
        Lihat semua catatan
      </Link>
    </div>
  )
}

/** Content of the dashboard's "Catatan terbaru" tab. It loads its own store, so the tab needs no extra wiring. */
export function LatestNote() {
  return (
    <StoreGate stores={STORES} skeleton={
        <div role="status" aria-label="Memuat catatan terbaru">
          <Skeleton className="h-[104px] rounded-card" />
        </div>
      }>
      <Latest />
    </StoreGate>
  )
}
