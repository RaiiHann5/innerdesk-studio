import { describe, expect, it } from 'vitest'
import { BLOCKS, filterBlocks } from './blocks'

describe('filterBlocks', () => {
  it('lists every block for a bare slash', () => {
    expect(filterBlocks('')).toBe(BLOCKS)
  })

  it('matches Indonesian labels and English names', () => {
    expect(filterBlocks('kutip').map((b) => b.id)).toEqual(['quote'])
    expect(filterBlocks('todo').map((b) => b.id)).toEqual(['task'])
    expect(filterBlocks('HEADING').map((b) => b.id)).toEqual(['h1', 'h2', 'h3'])
  })

  it('returns nothing when no block fits', () => {
    expect(filterBlocks('zzz')).toEqual([])
  })
})
