import { describe, expect, it } from 'vitest'
import { makeTask } from '@/lib/testing'
import { estimateUsage, formatDuration, parseEstimate, recentSessions, trackedMinutes } from './taskTime'

const log = [
  { date: '2026-10-01', minutes: 30 },
  { date: '2026-10-05', minutes: 50 },
  { date: '2026-10-03', minutes: 40 },
]

describe('taskTime', () => {
  it('sums the log', () => {
    expect(trackedMinutes(makeTask({ timeLog: log }))).toBe(120)
    expect(trackedMinutes(makeTask())).toBe(0)
  })

  it('lists sessions newest first and respects the limit', () => {
    const task = makeTask({ timeLog: log })
    expect(recentSessions(task).map((e) => e.date)).toEqual(['2026-10-05', '2026-10-03', '2026-10-01'])
    expect(recentSessions(task, 2)).toHaveLength(2)
    expect(task.timeLog[0].date).toBe('2026-10-01')
  })

  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0 m')
    expect(formatDuration(45)).toBe('45 m')
    expect(formatDuration(60)).toBe('1 j')
    expect(formatDuration(90)).toBe('1 j 30 m')
    expect(formatDuration(-5)).toBe('0 m')
  })

  it('compares tracked time with the estimate', () => {
    expect(estimateUsage(makeTask({ timeLog: log }))).toBeNull()
    expect(estimateUsage(makeTask({ timeLog: log, estimateMinutes: 240 }))).toEqual({ tracked: 120, estimate: 240, percent: 50, over: 0 })
    expect(estimateUsage(makeTask({ timeLog: log, estimateMinutes: 100 }))).toEqual({ tracked: 120, estimate: 100, percent: 100, over: 20 })
    expect(estimateUsage(makeTask({ estimateMinutes: 0 }))).toBeNull()
  })

  it('parses the estimate field', () => {
    expect(parseEstimate('90')).toBe(90)
    expect(parseEstimate(' 15 ')).toBe(15)
    expect(parseEstimate('')).toBeUndefined()
    expect(parseEstimate('0')).toBeUndefined()
    expect(parseEstimate('-4')).toBeUndefined()
    expect(parseEstimate('1.5')).toBeUndefined()
    expect(parseEstimate('abc')).toBeUndefined()
    expect(parseEstimate(String(100 * 60))).toBeUndefined()
  })
})
