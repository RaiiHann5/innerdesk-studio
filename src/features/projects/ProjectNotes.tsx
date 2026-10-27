import { useMemo } from 'react'
import { NotePencil, Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useCreateNote } from '@/features/notes/hooks/useNotes'
import { NoteGrid } from '@/features/notes/NoteGrid'
import { useNoteStore } from '@/stores/entities'

/** The Catatan tab: the notes that belong to this project, in the same cards as the notes page. */
export function ProjectNotes({ projectId }: { projectId: string }) {
  const notes = useNoteStore((s) => s.items)
  const { create, creating } = useCreateNote()

  const own = useMemo(
    () =>
      notes
        .filter((n) => n.projectId === projectId && !n.archivedAt)
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)),
    [notes, projectId],
  )
  const createButton = (
    <Button variant="primary" onClick={() => void create(projectId)} disabled={creating}>
      <Plus weight="bold" aria-hidden />
      Catatan baru
    </Button>
  )

  if (own.length === 0) {
    return <EmptyState icon={NotePencil} title="Belum ada catatan untuk project ini" description="Catatan baru dari sini langsung terhubung ke project ini." action={createButton} />
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm tabular-nums text-muted">{own.length} catatan</p>
        {createButton}
      </div>
      <NoteGrid notes={own} pending={false} />
    </div>
  )
}
