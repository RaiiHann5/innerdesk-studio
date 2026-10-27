import { libraryItemRepo, libraryLogRepo, libraryQuoteRepo } from '@/data/repos'
import { isoDay } from '@/lib/date'
import { clampRating } from '@/lib/library'
import { useLibraryItemStore, useLibraryLogStore, useLibraryQuoteStore, useNoteStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { LibraryItem, LibraryLog, LibraryQuote, LibraryStatus, NewEntity, NoteContent } from '@/types/domain'

const toast = (message: string, action?: { label: string; run: () => void }) => useUiStore.getState().showToast(message, action)

async function patch(item: LibraryItem, changes: Partial<NewEntity<LibraryItem>>, failure: string): Promise<boolean> {
  try {
    await useLibraryItemStore.getState().update(item.id, changes)
    return true
  } catch {
    toast(failure)
    return false
  }
}

/**
 * Changes where an item stands. Finishing stamps the day, and a book is taken to its last page. Anything that is not
 * finished loses its finish date, so starting a book again does not leave it counted in last year's total.
 */
export function setStatus(item: LibraryItem, status: LibraryStatus): Promise<boolean> {
  if (status === item.status) return Promise.resolve(true)
  const changes: Partial<NewEntity<LibraryItem>> = { status, finishedAt: status === 'done' ? (item.finishedAt ?? isoDay(0)) : undefined }
  if (status === 'done' && item.kind === 'buku' && item.pages) changes.currentPage = item.pages
  return patch(item, changes, 'Status gagal diubah.')
}

/** Sets the rating in half-stars. Passing undefined, 0 or anything unusable clears it. */
export const setRating = (item: LibraryItem, rating: number | undefined): Promise<boolean> => patch(item, { rating: clampRating(rating) }, 'Rating gagal disimpan.')

export const setFavorite = (item: LibraryItem, favorite: boolean): Promise<boolean> => patch(item, { favorite: favorite || undefined }, 'Gagal menyimpan.')

export const setFinishedAt = (item: LibraryItem, date: string): Promise<boolean> => patch(item, { finishedAt: date || undefined }, 'Tanggal gagal disimpan.')

/**
 * Moves a book to a page. The first page read starts it; the last one finishes it. Returns false when it could not be saved.
 */
export async function setProgress(item: LibraryItem, page: number): Promise<boolean> {
  const pages = item.pages
  const next = Math.max(0, Math.round(page))
  const clamped = pages ? Math.min(pages, next) : next
  const changes: Partial<NewEntity<LibraryItem>> = { currentPage: clamped }
  if (pages && clamped >= pages && item.status !== 'done') {
    changes.status = 'done'
    changes.finishedAt = item.finishedAt ?? isoDay(0)
  } else if (clamped > 0 && item.status === 'planned') {
    changes.status = 'active'
  }
  const ok = await patch(item, changes, 'Halaman gagal disimpan.')
  if (ok && changes.status === 'done') toast('Ditandai selesai dibaca.')
  return ok
}

export const saveReview = (item: LibraryItem, review: NoteContent, excerpt: string): Promise<boolean> =>
  patch(item, { review, reviewExcerpt: excerpt }, 'Ulasan gagal disimpan.')

export const setSpoilers = (item: LibraryItem, on: boolean): Promise<boolean> => patch(item, { reviewHasSpoilers: on || undefined }, 'Gagal menyimpan.')

/** Deletes an item with its viewing history and its quotes. The undo puts back all three with their original ids. */
export async function deleteItemWithUndo(item: LibraryItem): Promise<boolean> {
  const logs = useLibraryLogStore.getState().items.filter((l) => l.itemId === item.id)
  const quotes = useLibraryQuoteStore.getState().items.filter((q) => q.itemId === item.id)
  try {
    for (const log of logs) await libraryLogRepo.remove(log.id)
    for (const quote of quotes) await libraryQuoteRepo.remove(quote.id)
    await libraryItemRepo.remove(item.id)
  } catch {
    toast('Gagal menghapus.')
    return false
  }
  useLibraryItemStore.setState((s) => ({ items: s.items.filter((i) => i.id !== item.id) }))
  useLibraryLogStore.setState((s) => ({ items: s.items.filter((l) => l.itemId !== item.id) }))
  useLibraryQuoteStore.setState((s) => ({ items: s.items.filter((q) => q.itemId !== item.id) }))
  toast(`“${item.title}” dihapus.`, {
    label: 'Urungkan',
    run: () => {
      void (async () => {
        try {
          const restored = await libraryItemRepo.restore(item)
          const restoredLogs: LibraryLog[] = []
          for (const log of logs) restoredLogs.push(await libraryLogRepo.restore(log))
          const restoredQuotes: LibraryQuote[] = []
          for (const quote of quotes) restoredQuotes.push(await libraryQuoteRepo.restore(quote))
          useLibraryItemStore.setState((s) => ({ items: [...s.items, restored] }))
          useLibraryLogStore.setState((s) => ({ items: [...s.items, ...restoredLogs] }))
          useLibraryQuoteStore.setState((s) => ({ items: [...s.items, ...restoredQuotes] }))
        } catch {
          toast('Gagal mengembalikan.')
        }
      })()
    },
  })
  return true
}

/** Adds a viewing or a reading session. A session that ends past the book's current page moves the book there. */
export async function addLog(item: LibraryItem, input: NewEntity<LibraryLog>): Promise<boolean> {
  try {
    await useLibraryLogStore.getState().add(input)
  } catch {
    toast('Riwayat gagal disimpan.')
    return false
  }
  if (item.kind === 'buku' && input.toPage !== undefined && input.toPage > (item.currentPage ?? 0)) await setProgress(item, input.toPage)
  // A film that has a viewing on record has been watched, and it was finished on the day of that viewing.
  if (item.kind === 'film' && item.status !== 'done') await patch(item, { status: 'done', finishedAt: input.date }, 'Status gagal diubah.')
  return true
}

export async function addQuote(input: NewEntity<LibraryQuote>): Promise<boolean> {
  try {
    await useLibraryQuoteStore.getState().add(input)
    return true
  } catch {
    toast('Gagal menyimpan.')
    return false
  }
}

async function removeWithUndo<T extends LibraryLog | LibraryQuote>(entry: T, remove: (id: string) => Promise<void>, restore: (entry: T) => Promise<T>, put: (entry: T) => void, label: string) {
  try {
    await remove(entry.id)
  } catch {
    return toast('Gagal menghapus.')
  }
  toast(`${label} dihapus.`, {
    label: 'Urungkan',
    run: () => {
      restore(entry).then(put, () => toast('Gagal mengembalikan.'))
    },
  })
}

export const removeLogWithUndo = (log: LibraryLog) =>
  removeWithUndo(
    log,
    (id) => useLibraryLogStore.getState().remove(id),
    (entry) => libraryLogRepo.restore(entry),
    (entry) => useLibraryLogStore.setState((s) => ({ items: [...s.items, entry] })),
    'Riwayat',
  )

export const removeQuoteWithUndo = (quote: LibraryQuote) =>
  removeWithUndo(
    quote,
    (id) => useLibraryQuoteStore.getState().remove(id),
    (entry) => libraryQuoteRepo.restore(entry),
    (entry) => useLibraryQuoteStore.setState((s) => ({ items: [...s.items, entry] })),
    'Kutipan',
  )

/** Starts a note about an item, linked to it, and returns its id. */
export async function startNoteAbout(item: LibraryItem): Promise<string | null> {
  try {
    const note = await useNoteStore.getState().add({
      title: item.title,
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      excerpt: '',
      tags: [item.kind],
      pinned: false,
      libraryItemId: item.id,
    })
    return note.id
  } catch {
    toast('Catatan gagal dibuat.')
    return null
  }
}

/** For the detail page: how many times a film was watched, from its history. */
export const watchCount = (logs: readonly LibraryLog[], itemId: string): number => logs.filter((l) => l.itemId === itemId).length

