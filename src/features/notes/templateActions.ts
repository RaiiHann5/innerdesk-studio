import { noteTemplateRepo } from '@/data/repos'
import { useNoteTemplateStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { Note, NoteTemplate } from '@/types/domain'
import { templateFromNote } from './lib/templates'

/** Keeps the note's title, content and tags as a template. Throws when it cannot be saved, so the dialog can say so. */
export async function saveNoteAsTemplate(note: Pick<Note, 'title' | 'content' | 'tags'>, name: string, description?: string): Promise<NoteTemplate> {
  return useNoteTemplateStore.getState().add(templateFromNote(note, name, description))
}

/** Deletes a saved template and offers an undo that puts it back with its original id and timestamps. */
export async function deleteTemplateWithUndo(template: NoteTemplate): Promise<void> {
  const { showToast } = useUiStore.getState()
  try {
    await useNoteTemplateStore.getState().remove(template.id)
  } catch {
    return showToast('Template gagal dihapus.')
  }
  showToast('Template dihapus.', {
    label: 'Urungkan',
    run: () => {
      noteTemplateRepo.restore(template).then(
        (restored) => useNoteTemplateStore.setState((s) => ({ items: [...s.items, restored] })),
        () => useUiStore.getState().showToast('Template gagal dikembalikan.'),
      )
    },
  })
}
