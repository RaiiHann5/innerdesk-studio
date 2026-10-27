import { describe, expect, it } from 'vitest'
import { LENSES, lensFor } from './lenses'

describe('lensFor', () => {
  it('is stable for a seed and steps along with the shift', () => {
    expect(lensFor('bsm-1')).toBe(lensFor('bsm-1'))
    expect(lensFor('bsm-1', 1)).not.toBe(lensFor('bsm-1', 0))
  })
  it('wraps in both directions and always returns a known lens', () => {
    expect(lensFor('bsm-1', LENSES.length)).toBe(lensFor('bsm-1', 0))
    expect(LENSES).toContain(lensFor('bsm-1', -3))
  })
})
