import { describe, expect, it } from 'vitest'
import { doc, paragraph, EMPTY_DOC } from '@/lib/editorDoc'
import { countWords, doneCount, partsDone, percentDone, readingMinutes, streakDays, writingWords } from './progress'

describe('partsDone', () => {
  it('is all false for a day with nothing', () => {
    const parts = partsDone(undefined, undefined)
    expect(doneCount(parts)).toBe(0)
    expect(percentDone(parts)).toBe(0)
  })

  it('counts a mood on its own as one part', () => {
    expect(doneCount(partsDone({ level: 4 }, undefined))).toBe(1)
  })

  it('reads each written part', () => {
    const parts = partsDone({ level: 3 }, { content: doc(paragraph('Rapat lancar.')), gratitude: ['Kopi'], learning: '  ' })
    expect(parts).toEqual({ mood: true, gratitude: true, highlights: true, learning: false })
    expect(percentDone(parts)).toBe(75)
  })

  it('treats an empty document as not written', () => {
    expect(partsDone(undefined, { content: EMPTY_DOC }).highlights).toBe(false)
  })
})

describe('words', () => {
  it('counts words across spaces and newlines', () => {
    expect(countWords('  satu dua\ntiga ')).toBe(3)
    expect(countWords('')).toBe(0)
  })

  it('rounds reading time up and never shows zero for real text', () => {
    expect(readingMinutes(0)).toBe(0)
    expect(readingMinutes(12)).toBe(1)
    expect(readingMinutes(201)).toBe(2)
  })

  it('adds up gratitude, highlights and learning', () => {
    expect(writingWords({ content: doc(paragraph('dua kata')), gratitude: ['satu'], learning: 'tiga empat' })).toBe(5)
  })
})

describe('streakDays', () => {
  const filled = new Set(['2026-10-08', '2026-10-09', '2026-10-10'])

  it('counts back from today', () => {
    expect(streakDays(filled, '2026-10-10')).toBe(3)
  })

  it('does not break when today is still empty', () => {
    expect(streakDays(new Set(['2026-10-08', '2026-10-09']), '2026-10-10')).toBe(2)
  })

  it('stops at a gap', () => {
    expect(streakDays(new Set(['2026-10-06', '2026-10-09', '2026-10-10']), '2026-10-10')).toBe(2)
  })

  it('is zero when yesterday and today are both empty', () => {
    expect(streakDays(new Set(['2026-10-01']), '2026-10-10')).toBe(0)
  })
})
