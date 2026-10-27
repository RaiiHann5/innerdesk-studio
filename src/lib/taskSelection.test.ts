import { describe, expect, it } from 'vitest'
import { allState, pruneSelection, selectRange, toggleAll, toggleId } from './taskSelection'

const rows = ['a', 'b', 'c', 'd', 'e']

describe('taskSelection', () => {
  it('toggles without mutating', () => {
    const start = new Set(['a'])
    expect([...toggleId(start, 'b')]).toEqual(['a', 'b'])
    expect([...toggleId(start, 'a')]).toEqual([])
    expect([...start]).toEqual(['a'])
  })

  it('selects a range in either direction and keeps what was selected', () => {
    expect([...selectRange(new Set(['e']), rows, 'b', 'd')].sort()).toEqual(['b', 'c', 'd', 'e'])
    expect([...selectRange(new Set(), rows, 'd', 'b')].sort()).toEqual(['b', 'c', 'd'])
  })

  it('falls back to a toggle without a usable anchor', () => {
    expect([...selectRange(new Set(), rows, null, 'c')]).toEqual(['c'])
    expect([...selectRange(new Set(), rows, 'gone', 'c')]).toEqual(['c'])
  })

  it('reports none, some and all', () => {
    expect(allState(new Set(), rows)).toBe('none')
    expect(allState(new Set(['a']), rows)).toBe('some')
    expect(allState(new Set(rows), rows)).toBe('all')
    expect(allState(new Set(['zzz']), rows)).toBe('none')
  })

  it('toggleAll selects all, or clears when all are selected', () => {
    expect([...toggleAll(new Set(['a']), rows)]).toEqual(rows)
    expect([...toggleAll(new Set(rows), rows)]).toEqual([])
  })

  it('prunes ids that are no longer listed, and keeps the same set when nothing changes', () => {
    const same = new Set(['a', 'b'])
    expect(pruneSelection(same, rows)).toBe(same)
    expect([...pruneSelection(new Set(['a', 'x']), rows)]).toEqual(['a'])
  })
})
