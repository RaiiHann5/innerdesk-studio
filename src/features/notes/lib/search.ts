import type { Note } from '@/types/domain'

/** Lowercase and strip accents, so "Rapat" finds "rapat" and "cafe" finds "café". */
const fold = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** True when every word of the query appears in the title, excerpt or a tag. */
export function matchesQuery(note: Note, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = fold([note.title, note.excerpt, ...note.tags].join(' '))
  return words.every((word) => haystack.includes(word))
}

export const searchNotes = (notes: Note[], query: string): Note[] => notes.filter((note) => matchesQuery(note, query))
