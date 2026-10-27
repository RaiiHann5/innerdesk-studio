import { useParams } from 'react-router-dom'
import { Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { StoreGate } from '@/components/ui/StoreGate'
import { useNoteStore, useProjectStore } from '@/stores/entities'
import './fonts'
import { useCreateNote } from './hooks/useNotes'
import { useNewNoteShortcut } from './hooks/useNewNoteShortcut'
import { NoteEditor } from './NoteEditor'
import { NoteEditorSkeleton } from './NoteEditorStates'

const STORES = [useNoteStore, useProjectStore]

/** /notes/:noteId: the same page header as the other pages, then the top bar, the sheet and the Tampilan panel. */
export default function NotePage() {
  const { noteId } = useParams<{ noteId: string }>()
  const { create, creating } = useCreateNote()
  useNewNoteShortcut(create)

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <div className="p-4 pb-3 md:p-6 md:pb-4">
        <PageHeader
          title="Catatan"
          description="Ide, keputusan, dan hasil rapat di satu tempat."
          actions={
            <Button variant="primary" onClick={() => void create()} disabled={creating}>
              <Plus weight="bold" aria-hidden />
              Catatan baru
            </Button>
          }
        />
      </div>
      <StoreGate stores={STORES} skeleton={<NoteEditorSkeleton />}>
        <NoteEditor noteId={noteId} />
      </StoreGate>
    </div>
  )
}
