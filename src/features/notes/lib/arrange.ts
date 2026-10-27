import type { Note } from '@/types/domain'

export type NoteSort = 'updated' | 'created' | 'title'

export const SORT_OPTIONS: Array<{ value: NoteSort; label: string }> = [
  { value: 'updated', label: 'Terakhir diedit' },
  { value: 'created', label: 'Dibuat' },
  { value: 'title', label: 'Judul' },
]

const COMPARE: Record<NoteSort, (a: Note, b: Note) => number> = {
  updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  created: (a, b) => b.createdAt.localeCompare(a.createdAt),
  title: (a, b) => a.title.localeCompare(b.title, 'id', { sensitivity: 'base' }),
}

export type NoteTab = 'all' | 'pinned' | 'archived'

export const TAB_ITEMS: Array<{ value: NoteTab; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'pinned', label: 'Disematkan' },
  { value: 'archived', label: 'Arsip' },
]

export interface NoteGroups {
  pinned: Note[]
  rest: Note[]
}

interface Filters {
  tag: string | null
  /** Ids returned by the repo search, or null when there is no query. */
  matchIds: Set<string> | null
}

interface ArrangeOptions extends Filters {
  sort: NoteSort
  /** Which tab to show. Defaults to the active notes. */
  tab?: NoteTab
}

export const isActive = (note: Note) => !note.archivedAt

/** Whether a note belongs on a tab. Archived notes only show on their own tab, pinned or not. */
export const inTab = (note: Note, tab: NoteTab): boolean =>
  tab === 'archived' ? !isActive(note) : isActive(note) && (tab === 'all' || note.pinned)

const matchesFilters = (note: Note, { tag, matchIds }: Filters) => (!tag || note.tags.includes(tag)) && (!matchIds || matchIds.has(note.id))

/**
 * Applies the tab, tag and search filters, sorts, and splits pinned notes from the rest.
 * On the archive tab everything lands in `rest`, because a pin means nothing there.
 */
export function arrangeNotes(notes: Note[], { tab = 'all', tag, sort, matchIds }: ArrangeOptions): NoteGroups {
  const sorted = notes.filter((n) => inTab(n, tab) && matchesFilters(n, { tag, matchIds })).sort(COMPARE[sort])
  if (tab === 'archived') return { pinned: [], rest: sorted }
  return { pinned: sorted.filter((n) => n.pinned), rest: sorted.filter((n) => !n.pinned) }
}

/** How many notes each tab holds under the current tag and search, so the numbers match what the tab will show. */
export function countByTab(notes: Note[], filters: Filters): Record<NoteTab, number> {
  const matching = notes.filter((n) => matchesFilters(n, filters))
  return {
    all: matching.filter((n) => inTab(n, 'all')).length,
    pinned: matching.filter((n) => inTab(n, 'pinned')).length,
    archived: matching.filter((n) => inTab(n, 'archived')).length,
  }
}

/** Tags in use on a tab (the active notes by default), most used first, then alphabetical. */
export function collectTags(notes: Note[], tab: NoteTab = 'all'): string[] {
  const counts = new Map<string, number>()
  for (const note of notes.filter((n) => inTab(n, tab))) for (const tag of note.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  return [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)! || a.localeCompare(b, 'id'))
}

/** The note edited most recently, for the dashboard. Archived notes do not count. */
export function latestNote(notes: Note[]): Note | undefined {
  return notes.filter(isActive).sort(COMPARE.updated)[0]
}
