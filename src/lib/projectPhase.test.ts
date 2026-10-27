import { describe, expect, it } from 'vitest'
import { PHASES, PHASE_LABEL, nextPhase } from './projectPhase'

describe('projectPhase', () => {
  it('has the four phases in order, each with a label', () => {
    expect(PHASES).toEqual(['riset', 'desain', 'pengembangan', 'peluncuran'])
    expect(PHASES.map((p) => PHASE_LABEL[p])).toEqual(['Riset', 'Desain', 'Pengembangan', 'Peluncuran'])
  })

  it('moves to the next phase and stops at the last', () => {
    expect(nextPhase('riset')).toBe('desain')
    expect(nextPhase('pengembangan')).toBe('peluncuran')
    expect(nextPhase('peluncuran')).toBeNull()
  })
})
