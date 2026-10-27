import { addDays, addMonths, endOfMonth, format, parseISO, startOfMonth } from 'date-fns'
import { fmt, toISODate } from '@/lib/date'
import { docToText } from '@/lib/editorDoc'
import type { JournalEntry } from '@/types/domain'
import { hasTag } from './tags'

export interface RailDay {
  date: string
  entry?: JournalEntry
}

export interface RailMonth {
  /** yyyy-MM */
  key: string
  label: string
  /** Newest day first. */
  days: RailDay[]
}

/**
 * Every day from today back to the first month that has an entry, grouped by month, newest first.
 * The current month is always there, so a new journal still shows today.
 */
export function buildRailMonths(entries: JournalEntry[], today: string, extraDates: string[] = []): RailMonth[] {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]))
  // Days that only have a mood still count, so the list reaches back as far as any record does.
  const earliest = [...entries.map((e) => e.date), ...extraDates].reduce((min, d) => (d < min ? d : min), today)
  const months: RailMonth[] = []

  for (let cursor = startOfMonth(parseISO(today)); toISODate(cursor) >= toISODate(startOfMonth(parseISO(earliest))); cursor = addMonths(cursor, -1)) {
    const last = toISODate(endOfMonth(cursor)) < today ? endOfMonth(cursor) : parseISO(today)
    const days: RailDay[] = []
    for (let day = last; day >= cursor; day = addDays(day, -1)) {
      const date = toISODate(day)
      days.push({ date, entry: byDate.get(date) })
    }
    months.push({ key: format(cursor, 'yyyy-MM'), label: fmt(cursor, 'MMMM yyyy'), days })
  }
  return months
}

const normalize = (text: string) => text.toLocaleLowerCase('id').replace(/\s+/g, ' ').trim()

/** Entries whose title, text, gratitude, learning or tags contain every word of the query, newest first. */
export function searchEntries(entries: JournalEntry[], query: string): JournalEntry[] {
  const words = normalize(query).split(' ').filter(Boolean)
  if (words.length === 0) return []
  return entries
    .filter((entry) => {
      const haystack = normalize(
        [entry.title ?? '', docToText(entry.content), ...(entry.gratitude ?? []), entry.learning ?? '', ...(entry.tags ?? [])].join(' '),
      )
      return words.every((word) => haystack.includes(word))
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** Search and tag filter together. Either can be empty; with both empty nothing matches, as with `searchEntries`. */
export function findEntries(entries: JournalEntry[], query: string, tag: string): JournalEntry[] {
  const tagged = tag === '' ? entries : entries.filter((entry) => hasTag(entry.tags, tag))
  if (normalize(query) === '') return tag === '' ? [] : [...tagged].sort((a, b) => b.date.localeCompare(a.date))
  return searchEntries(tagged, query)
}

/** Every tag used across the entries, most used first. */
export function tagsInUse(entries: JournalEntry[]): string[] {
  const counts = new Map<string, number>()
  for (const entry of entries) for (const tag of entry.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'id')).map(([tag]) => tag)
}

/** Groups already-sorted entries by month, keeping their order. */
export function groupEntriesByMonth(entries: JournalEntry[]): Array<{ key: string; label: string; entries: JournalEntry[] }> {
  const groups: Array<{ key: string; label: string; entries: JournalEntry[] }> = []
  for (const entry of entries) {
    const key = entry.date.slice(0, 7)
    const last = groups[groups.length - 1]
    if (last?.key === key) last.entries.push(entry)
    else groups.push({ key, label: fmt(entry.date, 'MMMM yyyy'), entries: [entry] })
  }
  return groups
}
