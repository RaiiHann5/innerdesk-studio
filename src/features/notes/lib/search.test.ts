import { describe, expect, it } from 'vitest'
import type { Note } from '@/types/domain'
import { matchesQuery, searchNotes } from './search'

const note = (patch: Partial<Note>): Note => ({
  id: 'n1',
  title: 'Catatan rapat klien',
  content: { type: 'doc', content: [] },
  excerpt: 'Ongkir dihitung otomatis per kota.',
  tags: ['klien', 'rapat'],
  pinned: false,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...patch,
})

describe('matchesQuery', () => {
  it('matches title, excerpt and tags without caring about case', () => {
    expect(matchesQuery(note({}), 'RAPAT')).toBe(true)
    expect(matchesQuery(note({}), 'ongkir')).toBe(true)
    expect(matchesQuery(note({ title: 'Lain', excerpt: '' }), 'klien')).toBe(true)
  })

  it('needs every word to match, in any order', () => {
    expect(matchesQuery(note({}), 'kota ongkir')).toBe(true)
    expect(matchesQuery(note({}), 'ongkir jakarta')).toBe(false)
  })

  it('ignores accents', () => {
    expect(matchesQuery(note({ title: 'Kopi di café' }), 'cafe')).toBe(true)
  })

  it('matches everything for a blank query', () => {
    expect(matchesQuery(note({}), '   ')).toBe(true)
  })
})

describe('searchNotes', () => {
  it('keeps only the matching notes', () => {
    const notes = [note({ id: 'a' }), note({ id: 'b', title: 'Ide fitur', excerpt: '', tags: ['ide'] })]
    expect(searchNotes(notes, 'ide').map((n) => n.id)).toEqual(['b'])
  })
})
