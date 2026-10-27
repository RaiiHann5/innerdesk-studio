import { useCallback } from 'react'
import { moodRepo } from '@/data/repos'
import { useMoodStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { MoodEntry, NewEntity } from '@/types/domain'

const draftOf = ({ date, level, factors, note }: MoodEntry): NewEntity<MoodEntry> => ({ date, level, factors, note })

/** Writes mood entries. One entry per day, so saving a day that already has one updates it. */
export function useMoodActions() {
  const showToast = useUiStore((s) => s.showToast)

  const save = useCallback(
    async (draft: NewEntity<MoodEntry>): Promise<boolean> => {
      try {
        const saved = await moodRepo.upsert(draft)
        useMoodStore.setState((s) => ({ items: [...s.items.filter((e) => e.date !== saved.date), saved] }))
        return true
      } catch {
        showToast('Catatan belum tersimpan. Coba lagi.')
        return false
      }
    },
    [showToast],
  )

  const remove = useCallback(
    async (entry: MoodEntry) => {
      try {
        await useMoodStore.getState().remove(entry.id)
      } catch {
        showToast('Catatan tidak bisa dihapus.')
        return
      }
      showToast('Catatan dihapus', { label: 'Urungkan', run: () => void save(draftOf(entry)) })
    },
    [save, showToast],
  )

  return { save, remove }
}
