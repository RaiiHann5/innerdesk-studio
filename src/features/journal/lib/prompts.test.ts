import { describe, expect, it } from 'vitest'
import { JOURNAL_PROMPTS, promptForDate } from './prompts'

describe('promptForDate', () => {
  it('is stable for a date', () => {
    expect(promptForDate('2026-10-10')).toBe(promptForDate('2026-10-10'))
  })

  it('changes every day and cycles through the whole list', () => {
    const seen = new Set<string>()
    for (let i = 0; i < JOURNAL_PROMPTS.length; i++) {
      const a = promptForDate(`2026-03-${String(i + 1).padStart(2, '0')}`)
      const b = promptForDate(`2026-03-${String(i + 2).padStart(2, '0')}`)
      expect(a).not.toBe(b)
      seen.add(a)
    }
    expect(seen.size).toBe(JOURNAL_PROMPTS.length)
  })

  it('has no duplicate prompts', () => {
    expect(new Set(JOURNAL_PROMPTS).size).toBe(JOURNAL_PROMPTS.length)
  })
})
