import { describe, expect, it } from 'vitest'
import type { FocusSession } from '@/types/domain'
import { focusSecondsByDay, focusTotals, sessionsOn } from './focusSelectors'

const day = (n: number, h = 9) => new Date(2026, 9, n, h, 0, 0)

const session = (over: Partial<FocusSession> & Pick<FocusSession, 'startedAt' | 'actualSeconds'>): FocusSession => ({
  id: 'FCS-1',
  mode: 'focus',
  plannedSeconds: 1500,
  endedAt: over.startedAt,
  completed: true,
  createdAt: over.startedAt,
  updatedAt: over.startedAt,
  ...over,
})

describe('focusSecondsByDay', () => {
  it('adds focus sessions to the day they started on', () => {
    const totals = focusSecondsByDay([
      session({ id: 'a', startedAt: day(3).toISOString(), actualSeconds: 1500 }),
      session({ id: 'b', startedAt: day(3, 14).toISOString(), actualSeconds: 900 }),
    ])
    expect(totals.get('2026-10-03')).toBe(2400)
  })

  it('leaves breaks out of it entirely', () => {
    const totals = focusSecondsByDay([
      session({ mode: 'focus', startedAt: day(3).toISOString(), actualSeconds: 1500 }),
      session({ id: 'b', mode: 'short', startedAt: day(3).toISOString(), actualSeconds: 300 }),
      session({ id: 'c', mode: 'long', startedAt: day(3).toISOString(), actualSeconds: 900 }),
    ])
    expect(totals.get('2026-10-03')).toBe(1500)
  })

  it('keeps days apart', () => {
    const totals = focusSecondsByDay([
      session({ id: 'a', startedAt: day(3).toISOString(), actualSeconds: 1500 }),
      session({ id: 'b', startedAt: day(4).toISOString(), actualSeconds: 1500 }),
    ])
    expect(totals.get('2026-10-03')).toBe(1500)
    expect(totals.get('2026-10-04')).toBe(1500)
  })

  it('counts a partial block for the time actually spent', () => {
    const totals = focusSecondsByDay([
      session({ completed: false, startedAt: day(3).toISOString(), actualSeconds: 420 }),
    ])
    expect(totals.get('2026-10-03')).toBe(420)
  })

  it('is empty with nothing recorded', () => {
    expect(focusSecondsByDay([]).size).toBe(0)
  })
})

describe('focusSecondsByDay with task time logs', () => {
  const tasks = new Set(['TSK-1'])

  it('leaves a completed block to its task log, which already holds it', () => {
    const totals = focusSecondsByDay(
      [session({ taskId: 'TSK-1', startedAt: day(3).toISOString(), actualSeconds: 1500 })],
      tasks,
    )
    expect(totals.get('2026-10-03')).toBeUndefined()
  })

  it('keeps blocks that no task log holds', () => {
    const totals = focusSecondsByDay(
      [
        session({ id: 'a', startedAt: day(3).toISOString(), actualSeconds: 1500 }),
        session({ id: 'b', taskId: 'TSK-GONE', startedAt: day(3).toISOString(), actualSeconds: 600 }),
        session({ id: 'c', taskId: 'TSK-1', completed: false, startedAt: day(3).toISOString(), actualSeconds: 300 }),
      ],
      tasks,
    )
    expect(totals.get('2026-10-03')).toBe(2400)
  })
})

describe('sessionsOn', () => {
  it('returns one day newest first', () => {
    const list = [
      session({ id: 'a', startedAt: day(3, 9).toISOString(), actualSeconds: 1500 }),
      session({ id: 'b', startedAt: day(3, 14).toISOString(), actualSeconds: 1500 }),
      session({ id: 'c', startedAt: day(4, 9).toISOString(), actualSeconds: 1500 }),
    ]
    expect(sessionsOn(list, day(3)).map((s) => s.id)).toEqual(['b', 'a'])
  })
})

describe('focusTotals', () => {
  it('counts finished blocks, but every second spent focusing', () => {
    const totals = focusTotals([
      session({ id: 'a', startedAt: day(3).toISOString(), actualSeconds: 1500 }),
      session({ id: 'b', completed: false, startedAt: day(3).toISOString(), actualSeconds: 600 }),
      session({ id: 'c', mode: 'short', startedAt: day(3).toISOString(), actualSeconds: 300 }),
    ])
    expect(totals).toEqual({ count: 1, seconds: 2100 })
  })
})