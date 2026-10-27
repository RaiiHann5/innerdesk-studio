import { useState } from 'react'
import { FileText, Plus } from '@phosphor-icons/react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { StoreGate } from '@/components/ui/StoreGate'
import { useNoteStore, useNoteTemplateStore, useProjectStore } from '@/stores/entities'
import { useCreateNote } from './hooks/useNotes'
import { useNewNoteShortcut } from './hooks/useNewNoteShortcut'
import { NotesView, NotesViewSkeleton } from './NotesView'
import { TemplatePicker } from './TemplatePicker'

const STORES = [useNoteStore, useProjectStore, useNoteTemplateStore]

/** /notes: every note as a card. Opening or creating one goes to /notes/:noteId. */
export default function NotesPage() {
  const { create, createFromTemplate, creating } = useCreateNote()
  const [picking, setPicking] = useState(false)
  useNewNoteShortcut(create)

  return (
    <Page>
      <PageHeader
        title="Catatan"
        description="Ide, keputusan, dan hasil rapat di satu tempat."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => setPicking(true)} disabled={creating} aria-haspopup="dialog">
              <FileText aria-hidden />
              Dari template
            </Button>
            <Button variant="primary" onClick={() => void create()} disabled={creating}>
              <Plus weight="bold" aria-hidden />
              Catatan baru
            </Button>
          </div>
        }
      />
      <StoreGate stores={STORES} skeleton={<NotesViewSkeleton />}>
        <NotesView creating={creating} onCreate={() => void create()} />
      </StoreGate>
      <TemplatePicker
        open={picking}
        busy={creating}
        onClose={() => setPicking(false)}
        onPick={(source) => {
          setPicking(false)
          void createFromTemplate(source)
        }}
      />
    </Page>
  )
}
