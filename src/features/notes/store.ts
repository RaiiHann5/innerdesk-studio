import { create } from 'zustand'
import type { NoteSort, NoteTab } from './lib/arrange'

interface NoteFilterState {
  tab: NoteTab
  query: string
  tag: string | null
  sort: NoteSort
  setTab: (tab: NoteTab) => void
  setQuery: (query: string) => void
  setTag: (tag: string | null) => void
  setSort: (sort: NoteSort) => void
  clearFilters: () => void
}

/** What the notes grid shows. Kept outside the page so it survives opening a note and coming back. */
export const useNoteFilters = create<NoteFilterState>((set) => ({
  tab: 'all',
  query: '',
  tag: null,
  sort: 'updated',
  setTab: (tab) => set({ tab }),
  setQuery: (query) => set({ query }),
  setTag: (tag) => set({ tag }),
  setSort: (sort) => set({ sort }),
  clearFilters: () => set({ query: '', tag: null }),
}))
