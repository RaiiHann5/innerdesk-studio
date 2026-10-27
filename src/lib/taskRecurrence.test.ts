import { describe, expect, it } from 'vitest'
import { makeTask } from '@/lib/testing'
import { completesRecurring, nextDueDate, nextOccurrence, recurrenceLabel } from './taskRecurrence'

// Wednesday 14 October 2026.
const TODAY = '2026-10-14'
const daily = { freq: 'daily', interval: 1 } as const
const weekly = { freq: 'weekly', interval: 1 } as const
const monthly = { freq: 'monthly', interval: 1 } as const

describe('nextDueDate', () => {
  it('daily, finished on its due day: tomorrow', () => {
    expect(nextDueDate(TODAY, daily, TODAY)).toBe('2026-10-15')
  })

  it('finished early: the schedule keeps its rhythm instead of moving to today', () => {
    expect(nextDueDate('2026-10-19', weekly, TODAY)).toBe('2026-10-26')
  })

  it('finished late: missed dates are skipped and the next one is still ahead', () => {
    // Due 4 October, weekly: 11 October has passed too, so the next is 18 October.
    expect(nextDueDate('2026-10-04', weekly, TODAY)).toBe('2026-10-18')
    // Daily and three days behind: tomorrow, not an already overdue date.
    expect(nextDueDate('2026-10-11', daily, TODAY)).toBe('2026-10-15')
  })

  it('honours the interval', () => {
    expect(nextDueDate(TODAY, { freq: 'weekly', interval: 2 }, TODAY)).toBe('2026-10-28')
    expect(nextDueDate(TODAY, { freq: 'daily', interval: 3 }, TODAY)).toBe('2026-10-17')
  })

  it('clamps month ends with the calendar rule', () => {
    expect(nextDueDate('2026-01-31', monthly, '2026-01-31')).toBe('2026-02-28')
    expect(nextDueDate('2026-10-31', monthly, '2026-10-31')).toBe('2026-11-30')
  })

  it('a task with no due date repeats from today', () => {
    expect(nextDueDate(undefined, weekly, TODAY)).toBe('2026-10-21')
  })

  it('treats a zero or fractional interval as at least 1', () => {
    expect(nextDueDate(TODAY, { freq: 'daily', interval: 0 }, TODAY)).toBe('2026-10-15')
  })
})

describe('completesRecurring', () => {
  it('is true only when a recurring task goes to done', () => {
    const rule = { recurrence: weekly }
    expect(completesRecurring({ status: 'doing', ...rule }, 'done')).toBe(true)
    expect(completesRecurring({ status: 'done', ...rule }, 'done')).toBe(false)
    expect(completesRecurring({ status: 'done', ...rule }, 'todo')).toBe(false)
    expect(completesRecurring({ status: 'doing' }, 'done')).toBe(false)
  })
})

describe('nextOccurrence', () => {
  const base = makeTask({
    id: 'TSK-7',
    title: 'Cadangkan berkas',
    description: 'Ke penyimpanan awan',
    status: 'done',
    priority: 'high',
    projectId: 'prj-1',
    dueDate: TODAY,
    dueTime: '09:00',
    tags: ['rutin'],
    estimateMinutes: 20,
    recurrence: weekly,
    order: 4000,
    noteCount: 2,
    focusCount: 3,
    timeLog: [{ date: TODAY, minutes: 25 }],
    completedAt: TODAY,
    subtasks: [
      { id: 's1', title: 'Foto', done: true },
      { id: 's2', title: 'Dokumen', done: true },
    ],
  })

  it('creates the next copy with a new due date and fresh progress', () => {
    const next = nextOccurrence(base, [], TODAY)
    expect(next).toMatchObject({
      title: 'Cadangkan berkas',
      description: 'Ke penyimpanan awan',
      status: 'todo',
      priority: 'high',
      projectId: 'prj-1',
      dueDate: '2026-10-21',
      dueTime: '09:00',
      tags: ['rutin'],
      estimateMinutes: 20,
      recurrence: weekly,
      noteCount: 0,
      focusCount: 0,
      timeLog: [],
    })
    expect(next).not.toHaveProperty('completedAt')
    expect(next).not.toHaveProperty('archivedAt')
  })

  it('resets subtasks to unchecked and keeps their ids', () => {
    expect(nextOccurrence(base, [], TODAY)?.subtasks).toEqual([
      { id: 's1', title: 'Foto', done: false },
      { id: 's2', title: 'Dokumen', done: false },
    ])
  })

  it('keeps the order value', () => {
    expect(nextOccurrence(base, [], TODAY)?.order).toBe(4000)
  })

  it('does not share arrays with the finished task', () => {
    const next = nextOccurrence(base, [], TODAY)
    expect(next?.tags).not.toBe(base.tags)
    expect(next?.recurrence).not.toBe(base.recurrence)
  })

  it('returns null for a task that does not repeat', () => {
    expect(nextOccurrence(makeTask(), [], TODAY)).toBeNull()
  })

  it('returns null when an open copy for that date already exists, such as after reopening and finishing again', () => {
    const copy = makeTask({ id: 'TSK-8', title: base.title, projectId: 'prj-1', dueDate: '2026-10-21' })
    expect(nextOccurrence(base, [base, copy], TODAY)).toBeNull()
  })

  it('does not count a finished or archived copy, or one on another date, as a duplicate', () => {
    const copy = { title: base.title, projectId: 'prj-1', dueDate: '2026-10-21' }
    expect(nextOccurrence(base, [makeTask({ id: 'a', ...copy, status: 'done' })], TODAY)).not.toBeNull()
    expect(nextOccurrence(base, [makeTask({ id: 'b', ...copy, archivedAt: '2026-10-01T00:00:00.000Z' })], TODAY)).not.toBeNull()
    expect(nextOccurrence(base, [makeTask({ id: 'c', ...copy, dueDate: '2026-10-28' })], TODAY)).not.toBeNull()
  })
})

describe('recurrenceLabel', () => {
  it('reads naturally in Indonesian', () => {
    expect(recurrenceLabel(daily)).toBe('Setiap hari')
    expect(recurrenceLabel({ freq: 'weekly', interval: 2 })).toBe('Setiap 2 minggu')
    expect(recurrenceLabel(monthly)).toBe('Setiap bulan')
  })
})
