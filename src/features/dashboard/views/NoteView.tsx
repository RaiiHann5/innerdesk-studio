import { useMemo } from 'react'
import { NotePencil } from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui/EmptyState'
import { StoreGate } from '@/components/ui/StoreGate'
import { NoteCard } from '@/features/notes/NoteCard'
import { isActive } from '@/features/notes/lib/arrange'
import { useNoteStore, useProjectStore } from '@/stores/entities'
import { ViewSkeleton } from './ViewSkeleton'

const STORES = [useNoteStore, useProjectStore]
const LIMIT = 6

function Grid() {
  const notes = useNoteStore((s) => s.items)
  const latest = useMemo(
    () => notes.filter(isActive).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)).slice(0, LIMIT),
    [notes],
  )
  if (latest.length === 0) {
    return <EmptyState icon={NotePencil} title="Belum ada catatan" description="Catatan yang kamu sematkan atau ubah terakhir akan muncul di sini." />
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
      {latest.map((n) => (
        <NoteCard key={n.id} note={n} to={`/notes/${n.id}`} compact />
      ))}
    </div>
  )
}

export function NoteView() {
  return (
    <StoreGate stores={STORES} skeleton={<ViewSkeleton columns={2} />}>
      <Grid />
    </StoreGate>
  )
}
