import { describe, expect, it } from 'vitest'
import type { BrainstormSession } from '@/types/domain'
import { ideaCount, shorten, sortSessions } from './sessions'

const session = (id: string, updatedAt: string, extra: Partial<BrainstormSession> = {}): BrainstormSession => ({
  id,
  title: id,
  ideas: [],
  clusters: [],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt,
  ...extra,
})

describe('sortSessions', () => {
  it('puts the inbox first, then the most recently touched, without mutating', () => {
    const list = [session('a', '2026-10-02T00:00:00.000Z'), session('b', '2026-10-05T00:00:00.000Z'), session('inbox', '2026-09-01T00:00:00.000Z', { inbox: true })]
    expect(sortSessions(list).map((s) => s.id)).toEqual(['inbox', 'b', 'a'])
    expect(list.map((s) => s.id)).toEqual(['a', 'b', 'inbox'])
  })
})

describe('labels', () => {
  it('counts ideas', () => {
    expect(ideaCount(0)).toBe('Belum ada ide')
    expect(ideaCount(1)).toBe('1 ide')
    expect(ideaCount(12)).toBe('12 ide')
  })
  it('shortens only what is too long', () => {
    expect(shorten('Fitur', 10)).toBe('Fitur')
    expect(shorten('Fitur dashboard utama', 10)).toBe('Fitur das…')
  })
})
