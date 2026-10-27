import { describe, expect, it } from 'vitest'
import { doc, excerptOf, paragraph } from '@/lib/editorDoc'
import type { JournalEntry } from '@/types/domain'
import { buildRailMonths, findEntries, groupEntriesByMonth, searchEntries, tagsInUse } from './dateRail'

const make = (date: string, text: string, title?: string): JournalEntry => {
  const content = doc(paragraph(text))
  return { id: `j-${date}`, createdAt: '', updatedAt: '', date, title, content, excerpt: excerptOf(content) }
}

describe('buildRailMonths', () => {
  it('shows only the current month, up to today, when there are no entries', () => {
    const months = buildRailMonths([], '2026-10-10')
    expect(months).toHaveLength(1)
    expect(months[0].key).toBe('2026-10')
    expect(months[0].days[0].date).toBe('2026-10-10')
    expect(months[0].days).toHaveLength(10)
    expect(months[0].days.every((d) => d.entry === undefined)).toBe(true)
  })

  it('reaches back to the month of the earliest entry, listing full earlier months', () => {
    const months = buildRailMonths([make('2026-08-30', 'a'), make('2026-10-02', 'b')], '2026-10-10')
    expect(months.map((m) => m.key)).toEqual(['2026-10', '2026-09', '2026-08'])
    expect(months[1].days).toHaveLength(30)
    expect(months[1].days[0].date).toBe('2026-09-30')
    expect(months[2].days).toHaveLength(31)
  })

  it('attaches entries to their day', () => {
    const entry = make('2026-10-02', 'b')
    const day = buildRailMonths([entry], '2026-10-10')[0].days.find((d) => d.date === '2026-10-02')
    expect(day?.entry).toBe(entry)
  })
})

describe('searchEntries', () => {
  const entries = [make('2026-10-01', 'Jalan sore keliling kompleks'), make('2026-10-05', 'Rapat panjang', 'Hari Sibuk'), make('2026-09-20', 'Sore yang tenang')]

  it('matches title and body, case-insensitively, newest first', () => {
    expect(searchEntries(entries, 'SORE').map((e) => e.date)).toEqual(['2026-10-01', '2026-09-20'])
    expect(searchEntries(entries, 'sibuk').map((e) => e.date)).toEqual(['2026-10-05'])
  })

  it('requires every word to match', () => {
    expect(searchEntries(entries, 'sore kompleks').map((e) => e.date)).toEqual(['2026-10-01'])
  })

  it('returns nothing for a blank query', () => {
    expect(searchEntries(entries, '   ')).toEqual([])
  })
})

describe('groupEntriesByMonth', () => {
  it('splits a sorted list at month boundaries', () => {
    const groups = groupEntriesByMonth([make('2026-10-05', 'a'), make('2026-10-01', 'b'), make('2026-09-20', 'c')])
    expect(groups.map((g) => [g.key, g.entries.length])).toEqual([['2026-10', 2], ['2026-09', 1]])
  })
})

describe('mood-only days, tags and the combined filter', () => {
  const tagged = (date: string, text: string, extra: Partial<JournalEntry>): JournalEntry => ({ ...make(date, text), ...extra })
  const entries = [
    tagged('2026-10-09', 'rapat panjang', { tags: ['Kerja'], gratitude: ['kopi hangat'] }),
    tagged('2026-10-07', 'jalan sore', { tags: ['Kesehatan', 'Kerja'], learning: 'pelan itu perlu' }),
    tagged('2026-10-05', 'tidur cukup', {}),
  ]

  it('reaches back to a day that only has a mood', () => {
    const months = buildRailMonths([], '2026-10-10', ['2026-08-15'])
    expect(months.map((m) => m.key)).toEqual(['2026-10', '2026-09', '2026-08'])
  })

  it('searches gratitude, learning and tags as well as the highlights', () => {
    expect(searchEntries(entries, 'kopi').map((e) => e.date)).toEqual(['2026-10-09'])
    expect(searchEntries(entries, 'pelan').map((e) => e.date)).toEqual(['2026-10-07'])
    expect(searchEntries(entries, 'kesehatan').map((e) => e.date)).toEqual(['2026-10-07'])
  })

  it('filters by tag alone, newest first', () => {
    expect(findEntries(entries, '', 'kerja').map((e) => e.date)).toEqual(['2026-10-09', '2026-10-07'])
  })

  it('combines a tag with a search', () => {
    expect(findEntries(entries, 'jalan', 'Kerja').map((e) => e.date)).toEqual(['2026-10-07'])
  })

  it('finds nothing when both are empty', () => {
    expect(findEntries(entries, '  ', '')).toEqual([])
  })

  it('lists tags by how often they are used', () => {
    expect(tagsInUse(entries)).toEqual(['Kerja', 'Kesehatan'])
  })
})
