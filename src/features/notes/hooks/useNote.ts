import { useCallback } from 'react'
import { useNoteStore } from '@/stores/entities'
import type { Note } from '@/types/domain'
import { updateNote } from '../actions'
import { excerptFromContent } from '../lib/excerpt'

/** The parts of a note the editor changes. */
export type NoteDraft = Pick<Note, 'title' | 'content' | 'tags' | 'pinned' | 'projectId'>

/** One note by id, plus the save the editor hands to useAutosave. The excerpt is rebuilt on every save. */
export function useNote(noteId: string | undefined) {
  const note = useNoteStore((s) => (noteId ? s.items.find((n) => n.id === noteId) : undefined))

  const save = useCallback(async (id: string, draft: NoteDraft) => {
    await updateNote(id, { ...draft, excerpt: excerptFromContent(draft.content) })
  }, [])

  return { note, save }
}
