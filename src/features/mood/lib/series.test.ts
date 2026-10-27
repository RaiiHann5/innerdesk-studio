import { describe, expect, it } from 'vitest'
import type { MoodEntry, MoodLevel } from '@/types/domain'
import { lastDays, runsOf, trendSummary } from './series'

const entry = (date: string, level: MoodLevel): MoodEntry => ({
  id: date,
  date,
  level,
  factors: [],
  createdAt: '2026-10-10T00:00:00.000Z',
  updatedAt: '2026-10-10T00:00:00.000Z',
})

describe('lastDays', () => {
  it('returns one point per day ending today, with gaps as null', () => {
    const points = lastDays([entry('2026-10-10', 4), entry('2026-10-08', 2)], 4, '2026-10-10')
    expect(points.map((p) => p.date)).toEqual(['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'])
    expect(points.map((p) => p.level)).toEqual([null, 2, null, 4])
  })
})

describe('runsOf', () => {
  it('splits at missing days so the line never crosses a gap', () => {
    const points = lastDays([entry('2026-10-10', 4), entry('2026-10-09', 3), entry('2026-10-07', 2)], 5, '2026-10-10')
    expect(runsOf(points).map((run) => run.map((p) => p.index))).toEqual([[1], [3, 4]])
  })

  it('is empty when nothing is logged', () => {
    expect(runsOf(lastDays([], 3, '2026-10-10'))).toEqual([])
  })
})

describe('trendSummary', () => {
  it('states the count, average, extremes and latest days in words', () => {
    const points = lastDays([entry('2026-10-10', 5), entry('2026-10-09', 3), entry('2026-10-08', 1)], 30, '2026-10-10')
    const text = trendSummary(points)
    expect(text).toContain('3 hari tercatat, rata-rata 3,0 dari 5')
    expect(text).toContain('Tertinggi sangat baik pada 10 Okt')
    expect(text).toContain('terendah berat pada 8 Okt')
  })

  it('says so when there is nothing to chart', () => {
    expect(trendSummary(lastDays([], 30, '2026-10-10'))).toContain('Belum ada catatan')
  })
})
