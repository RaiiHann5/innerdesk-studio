import { useCallback } from 'react'
import { journalRepo } from '@/data/repos'
import { docToText, excerptOf } from '@/lib/editorDoc'
import { useJournalStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { EditorDoc, JournalEntry } from '@/types/domain'

export interface JournalDraft {
  title?: string
  content: EditorDoc
  gratitude: string[]
  learning: string
  tags: string[]
}

const isEmptyDraft = ({ title, content, gratitude, learning, tags }: JournalDraft) =>
  !title?.trim() && docToText(content) === '' && gratitude.length === 0 && learning.trim() === '' && tags.length === 0

/** The list preview: the highlights if there are any, otherwise whatever else was written. */
const excerptOfDraft = ({ content, gratitude, learning }: JournalDraft): string =>
  excerptOf(content) || excerptOf({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: learning.trim() || gratitude.join(', ') || ' ' }] }] })

/**
 * Writes the journal. Unlike `useMoodActions.save`, `saveDraft` throws on failure, because the autosaver
 * needs to know a save failed so it can keep the text and offer a retry.
 *
 * The store is updated through `setState` rather than `add`/`update`: the day repo decides between create
 * and update by date, and `createEntityStore` has no upsert.
 */
export function useJournalActions() {
  const showToast = useUiStore((s) => s.showToast)

  const saveDraft = useCallback(async (date: string, draft: JournalDraft): Promise<void> => {
    if (isEmptyDraft(draft)) {
      // A day cleared back to nothing stops existing, so the date list never shows a dot for a blank page.
      const existing = await journalRepo.getByDate(date)
      if (!existing) return
      await journalRepo.remove(existing.id)
      useJournalStore.setState((s) => ({ items: s.items.filter((e) => e.date !== date) }))
      return
    }
    const saved = await journalRepo.upsert({
      date,
      title: draft.title?.trim() || undefined,
      content: draft.content,
      gratitude: draft.gratitude,
      learning: draft.learning.trim() || undefined,
      tags: draft.tags,
      excerpt: excerptOfDraft(draft),
    })
    useJournalStore.setState((s) => ({ items: [...s.items.filter((e) => e.date !== saved.date), saved] }))
  }, [])

  /** Deletes a day's entry. `onRestore` runs after an undo so the open editor can show the restored text. */
  const remove = useCallback(
    async (entry: JournalEntry, onRestore?: () => void) => {
      try {
        await useJournalStore.getState().remove(entry.id)
      } catch {
        showToast('Catatan tidak bisa dihapus.')
        return false
      }
      showToast('Catatan dihapus', {
        label: 'Urungkan',
        run: () =>
          void saveDraft(entry.date, {
            title: entry.title,
            content: entry.content,
            gratitude: entry.gratitude ?? [],
            learning: entry.learning ?? '',
            tags: entry.tags ?? [],
          }).then(
            () => onRestore?.(),
            () => showToast('Catatan belum bisa dikembalikan.'),
          ),
      })
      return true
    },
    [saveDraft, showToast],
  )

  return { saveDraft, remove }
}
