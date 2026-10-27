import { noteRepo } from '@/data/repos'
import { useNoteStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { NewEntity, Note } from '@/types/domain'

/**
 * Writes that change an existing note. Each one goes to noteRepo first and then mirrors the result
 * into useNoteStore, so the list pane and the editor see the same data.
 */
export async function updateNote(id: string, patch: Partial<NewEntity<Note>>): Promise<Note> {
  const saved = await noteRepo.update(id, patch)
  useNoteStore.setState((s) => ({ items: s.items.map((n) => (n.id === id ? saved : n)) }))
  return saved
}

async function deleteNote(id: string): Promise<void> {
  await noteRepo.remove(id)
  useNoteStore.setState((s) => ({ items: s.items.filter((n) => n.id !== id) }))
}

async function restoreNote(note: Note): Promise<void> {
  const restored = await noteRepo.restore(note)
  useNoteStore.setState((s) => ({ items: [...s.items, restored] }))
}

/** Deletes the note and offers an undo toast that puts it back with its original id and timestamps. */
export async function deleteNoteWithUndo(note: Note, onRestored: (id: string) => void): Promise<void> {
  await deleteNote(note.id)
  useUiStore.getState().showToast('Catatan dihapus.', {
    label: 'Urungkan',
    run: () => {
      restoreNote(note).then(
        () => onRestored(note.id),
        () => useUiStore.getState().showToast('Catatan gagal dikembalikan.'),
      )
    },
  })
}

const failed = (message: string) => () => useUiStore.getState().showToast(message)

/** Pins or unpins a note. */
export async function togglePin(note: Note): Promise<void> {
  try {
    await updateNote(note.id, { pinned: !note.pinned })
  } catch {
    failed('Catatan gagal diperbarui.')()
  }
}

/** Moves a note out of the way into the archive. Anything pinned stays pinned, so restoring puts it back as it was. */
export async function archiveNoteWithUndo(note: Note): Promise<void> {
  try {
    await updateNote(note.id, { archivedAt: new Date().toISOString() })
  } catch {
    return failed('Catatan gagal diarsipkan.')()
  }
  useUiStore.getState().showToast('Catatan diarsipkan.', {
    label: 'Urungkan',
    run: () => void unarchiveNote(note).catch(failed('Catatan gagal dikembalikan.')),
  })
}

/** Brings a note back from the archive. Used by "Pulihkan" and by the undo of an archive. */
export async function unarchiveNote(note: Note): Promise<void> {
  await updateNote(note.id, { archivedAt: undefined })
}
