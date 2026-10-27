import { describe, expect, it } from 'vitest'
import type { Note } from '@/types/domain'
import { arrangeNotes, collectTags, countByTab, inTab, latestNote } from './arrange'

const note = (id: string, patch: Partial<Note> = {}): Note => ({
  id,
  title: id,
  content: { type: 'doc', content: [] },
  excerpt: '',
  tags: [],
  pinned: false,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...patch,
})

const ids = (notes: Note[]) => notes.map((n) => n.id)
const base = { tag: null, sort: 'updated' as const, matchIds: null }

describe('arrangeNotes', () => {
  const notes = [
    note('b', { title: 'Bumi', createdAt: '2026-10-03T00:00:00.000Z', updatedAt: '2026-10-04T00:00:00.000Z' }),
    note('a', { title: 'Awan', createdAt: '2026-10-02T00:00:00.000Z', updatedAt: '2026-10-09T00:00:00.000Z' }),
    note('c', { title: 'Cahaya', pinned: true, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-02T00:00:00.000Z' }),
  ]

  it('puts pinned notes in their own group', () => {
    const { pinned, rest } = arrangeNotes(notes, base)
    expect(ids(pinned)).toEqual(['c'])
    expect(ids(rest)).toEqual(['a', 'b'])
  })

  it('sorts by creation date or title', () => {
    expect(ids(arrangeNotes(notes, { ...base, sort: 'created' }).rest)).toEqual(['b', 'a'])
    expect(ids(arrangeNotes(notes, { ...base, sort: 'title' }).rest)).toEqual(['a', 'b'])
  })

  it('filters by tag and by search matches', () => {
    const tagged = [note('x', { tags: ['ide'] }), note('y', { tags: ['rapat'] })]
    expect(ids(arrangeNotes(tagged, { ...base, tag: 'ide' }).rest)).toEqual(['x'])
    expect(ids(arrangeNotes(tagged, { ...base, matchIds: new Set(['y']) }).rest)).toEqual(['y'])
  })

  it('hides archived notes', () => {
    const archived = [note('x', { archivedAt: '2026-10-05T00:00:00.000Z' }), note('y')]
    expect(ids(arrangeNotes(archived, base).rest)).toEqual(['y'])
  })
})

describe('arrangeNotes by tab', () => {
  const archivedAt = '2026-10-05T00:00:00.000Z'
  const notes = [
    note('a', { pinned: true, updatedAt: '2026-10-02T00:00:00.000Z' }),
    note('b', { updatedAt: '2026-10-09T00:00:00.000Z' }),
    note('c', { pinned: true, archivedAt, updatedAt: '2026-10-08T00:00:00.000Z' }),
    note('d', { archivedAt, updatedAt: '2026-10-07T00:00:00.000Z' }),
  ]

  it('shows active notes on "all", pinned ones first', () => {
    const { pinned, rest } = arrangeNotes(notes, { ...base, tab: 'all' })
    expect([...ids(pinned), ...ids(rest)]).toEqual(['a', 'b'])
  })

  it('shows only active pinned notes on "pinned"', () => {
    const { pinned, rest } = arrangeNotes(notes, { ...base, tab: 'pinned' })
    expect(ids(pinned)).toEqual(['a'])
    expect(rest).toEqual([])
  })

  it('shows archived notes on "archived", in one group and sorted, even when pinned', () => {
    const { pinned, rest } = arrangeNotes(notes, { ...base, tab: 'archived' })
    expect(pinned).toEqual([])
    expect(ids(rest)).toEqual(['c', 'd'])
  })

  it('applies tag and search filters inside a tab', () => {
    const tagged = [note('x', { tags: ['ide'], archivedAt }), note('y', { tags: ['rapat'], archivedAt }), note('z', { tags: ['ide'] })]
    expect(ids(arrangeNotes(tagged, { ...base, tab: 'archived', tag: 'ide' }).rest)).toEqual(['x'])
    expect(ids(arrangeNotes(tagged, { ...base, tab: 'archived', matchIds: new Set(['y', 'z']) }).rest)).toEqual(['y'])
  })

  it('puts a note on exactly one of "all" or "archived"', () => {
    for (const n of notes) expect(inTab(n, 'all')).toBe(!inTab(n, 'archived'))
  })
})

describe('countByTab', () => {
  const archivedAt = '2026-10-05T00:00:00.000Z'
  const notes = [
    note('a', { pinned: true, tags: ['ide'] }),
    note('b', { tags: ['rapat'] }),
    note('c', { pinned: true, tags: ['ide'], archivedAt }),
    note('d', { tags: ['ide'], archivedAt }),
  ]

  it('counts each tab', () => {
    expect(countByTab(notes, { tag: null, matchIds: null })).toEqual({ all: 2, pinned: 1, archived: 2 })
  })

  it('follows the tag and search filters', () => {
    expect(countByTab(notes, { tag: 'ide', matchIds: null })).toEqual({ all: 1, pinned: 1, archived: 2 })
    expect(countByTab(notes, { tag: null, matchIds: new Set(['b', 'd']) })).toEqual({ all: 1, pinned: 0, archived: 1 })
  })
})

describe('collectTags', () => {
  it('orders tags by use, then alphabetically', () => {
    const notes = [note('1', { tags: ['ide', 'rapat'] }), note('2', { tags: ['rapat'] }), note('3', { tags: ['belajar'] })]
    expect(collectTags(notes)).toEqual(['rapat', 'belajar', 'ide'])
  })

  it('ignores archived notes', () => {
    const notes = [note('1', { tags: ['lama'], archivedAt: '2026-10-05T00:00:00.000Z' }), note('2', { tags: ['baru'] })]
    expect(collectTags(notes)).toEqual(['baru'])
  })

  it('reads the tags of the tab being shown', () => {
    const notes = [
      note('1', { tags: ['lama'], archivedAt: '2026-10-05T00:00:00.000Z' }),
      note('2', { tags: ['baru'], pinned: true }),
      note('3', { tags: ['biasa'] }),
    ]
    expect(collectTags(notes, 'archived')).toEqual(['lama'])
    expect(collectTags(notes, 'pinned')).toEqual(['baru'])
  })
})

describe('latestNote', () => {
  it('picks the most recently edited note, pinned or not', () => {
    const notes = [
      note('lama', { updatedAt: '2026-10-01T00:00:00.000Z', pinned: true }),
      note('baru', { updatedAt: '2026-10-09T00:00:00.000Z' }),
    ]
    expect(latestNote(notes)?.id).toBe('baru')
  })

  it('skips archived notes and returns nothing for an empty list', () => {
    const notes = [note('arsip', { updatedAt: '2026-10-09T00:00:00.000Z', archivedAt: '2026-10-10T00:00:00.000Z' }), note('aktif')]
    expect(latestNote(notes)?.id).toBe('aktif')
    expect(latestNote([])).toBeUndefined()
  })
})
