import { addDays, parseISO } from 'date-fns'
import { toISODate } from '@/lib/date'
import { docToText } from '@/lib/editorDoc'
import type { JournalEntry, MoodEntry } from '@/types/domain'

export type PartId = 'mood' | 'gratitude' | 'highlights' | 'learning'

export const PARTS: Array<{ id: PartId; label: string }> = [
  { id: 'mood', label: 'Mood' },
  { id: 'gratitude', label: 'Syukur' },
  { id: 'highlights', label: 'Sorotan' },
  { id: 'learning', label: 'Pelajaran' },
]

export type PartsDone = Record<PartId, boolean>

type Writing = Pick<JournalEntry, 'content'> & Partial<Pick<JournalEntry, 'gratitude' | 'learning'>>

/** Which of the day's four parts have something in them. A day with only a mood counts one. */
export function partsDone(mood: Pick<MoodEntry, 'level'> | undefined, writing: Writing | undefined): PartsDone {
  return {
    mood: mood !== undefined,
    gratitude: (writing?.gratitude?.length ?? 0) > 0,
    highlights: writing ? docToText(writing.content) !== '' : false,
    learning: (writing?.learning?.trim() ?? '') !== '',
  }
}

export const doneCount = (parts: PartsDone): number => PARTS.filter(({ id }) => parts[id]).length

export const percentDone = (parts: PartsDone): number => Math.round((doneCount(parts) / PARTS.length) * 100)

export const countWords = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length

/** Minutes to read at a relaxed 200 words a minute. Anything written takes at least one. */
export const readingMinutes = (words: number): number => (words === 0 ? 0 : Math.max(1, Math.ceil(words / 200)))

/** Words in everything the person typed that day: gratitude lines, highlights and learning. */
export function writingWords(writing: Writing | undefined): number {
  if (!writing) return 0
  return countWords([...(writing.gratitude ?? []), docToText(writing.content), writing.learning ?? ''].join(' '))
}

/**
 * Consecutive days, counted back from today, that have a mood or a journal entry. A day that has not been
 * filled in yet does not break the run: it starts from yesterday until today is written.
 */
export function streakDays(filled: ReadonlySet<string>, today: string): number {
  let cursor = filled.has(today) ? today : toISODate(addDays(parseISO(today), -1))
  let count = 0
  while (filled.has(cursor)) {
    count += 1
    cursor = toISODate(addDays(parseISO(cursor), -1))
  }
  return count
}
