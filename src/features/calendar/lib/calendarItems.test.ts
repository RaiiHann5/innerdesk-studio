import { describe, expect, it } from 'vitest'
import type { Task } from '@/types/domain'
import { buildDayItems, taskMinutes } from './calendarItems'
import { makeProject } from '@/lib/testing'
import { makeEvent } from './testing'

const d = (day: number, h = 9, min = 0) => new Date(2026, 9, day, h, min)
const range = { start: d(1, 0), end: d(8, 0) }
const filters = { hiddenCategoryIds: [], showTasks: true }
const task = (dueDate: string, dueTime?: string): Task => ({
  id: 'TSK-1',
  title: 'Contoh task',
  status: 'todo',
  priority: 'medium',
  dueDate,
  dueTime,
  tags: [],
  noteCount: 0,
  timeLog: [],
  focusCount: 0,
  subtasks: [],
  order: 1000,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

describe('buildDayItems', () => {
  it('creates a bucket for every day in the range', () => {
    expect([...buildDayItems([], [], range, filters).keys()]).toHaveLength(7)
  })

  it('puts a multi-day all-day event on every day it covers, end exclusive', () => {
    const trip = makeEvent({ allDay: true, start: d(2, 0), end: d(5, 0) })
    const days = buildDayItems([trip], [], range, filters)
    expect(['2026-10-02', '2026-10-03', '2026-10-04'].map((k) => days.get(k)?.allDay.length)).toEqual([1, 1, 1])
    expect(days.get('2026-10-05')?.allDay).toHaveLength(0)
  })

  it('does not leak a timed event that ends at midnight into the next day', () => {
    const late = makeEvent({ start: d(3, 22), end: d(4, 0) })
    const days = buildDayItems([late], [], range, filters)
    expect(days.get('2026-10-03')?.timed).toHaveLength(1)
    expect(days.get('2026-10-04')?.timed).toHaveLength(0)
  })

  it('splits an event that crosses midnight across both days', () => {
    const overnight = makeEvent({ start: d(3, 22), end: d(4, 2) })
    const days = buildDayItems([overnight], [], range, filters)
    expect(days.get('2026-10-03')?.count).toBe(1)
    expect(days.get('2026-10-04')?.count).toBe(1)
  })

  it('hides categories and tasks according to the filters', () => {
    const event = makeEvent({ start: d(3), end: d(3, 10), categoryId: 'cat-pribadi' })
    const all = buildDayItems([event], [task('2026-10-03')], range, filters).get('2026-10-03')
    expect(all?.count).toBe(2)
    const filtered = buildDayItems([event], [task('2026-10-03')], range, {
      hiddenCategoryIds: ['cat-pribadi'],
      showTasks: false,
    }).get('2026-10-03')
    expect(filtered?.count).toBe(0)
  })

  it('includes recurring occurrences', () => {
    const daily = makeEvent({ start: d(1), end: d(1, 10), recurrence: { freq: 'daily', exceptions: [] } })
    const days = buildDayItems([daily], [], range, filters)
    expect([...days.values()].every((day) => day.timed.length === 1)).toBe(true)
  })

  it('gives every day its own arrays', () => {
    const days = buildDayItems([makeEvent({ start: d(1), end: d(1, 10) })], [], range, filters)
    const first = days.get('2026-10-01')!
    const second = days.get('2026-10-02')!
    expect(first.timed).not.toBe(second.timed)
    expect(second.timed).toHaveLength(0)
  })
})

describe('task placement', () => {
  it('puts a task with no time in the all-day row', () => {
    const day = buildDayItems([], [task('2026-10-03')], range, filters).get('2026-10-03')
    expect(day?.tasks).toHaveLength(1)
    expect(day?.timedTasks).toHaveLength(0)
  })

  it('puts a task with a time on the hour grid', () => {
    const day = buildDayItems([], [task('2026-10-03', '16:30')], range, filters).get('2026-10-03')
    expect(day?.timedTasks).toEqual([{ task: expect.objectContaining({ dueTime: '16:30' }), minutes: 990 }])
    expect(day?.tasks).toHaveLength(0)
  })

  it('counts a timed task once, in the total every view reads', () => {
    const day = buildDayItems([], [task('2026-10-03', '16:30')], range, filters).get('2026-10-03')
    expect(day?.count).toBe(1)
  })

  it('ignores an unreadable time and falls back to the all-day row', () => {
    const day = buildDayItems([], [task('2026-10-03', 'sepulang-siangan')], range, filters).get('2026-10-03')
    expect(day?.tasks).toHaveLength(1)
    expect(day?.timedTasks).toHaveLength(0)
  })
})

describe('buildDayItems with archived tasks', () => {
  it('leaves an archived task off the calendar and out of the day count', () => {
    const archived = { ...task('2026-10-03', '09:00'), id: 'TSK-9', archivedAt: '2026-10-01T00:00:00.000Z' }
    const kept = task('2026-10-03')
    const day = buildDayItems([], [archived, kept], range, filters).get('2026-10-03')
    expect(day?.tasks).toEqual([kept])
    expect(day?.timedTasks).toEqual([])
    expect(day?.count).toBe(1)
  })
})

describe('taskMinutes', () => {
  it('reads a wall-clock time', () => {
    expect(taskMinutes('00:00')).toBe(0)
    expect(taskMinutes('9:05')).toBe(545)
    expect(taskMinutes('23:59')).toBe(1439)
  })

  it('rejects anything that is not a time of day', () => {
    expect(taskMinutes(undefined)).toBeNull()
    expect(taskMinutes('')).toBeNull()
    expect(taskMinutes('24:00')).toBeNull()
    expect(taskMinutes('nope')).toBeNull()
  })
})

describe('buildDayItems: milestones', () => {
  const project = makeProject({
    id: 'prj-1',
    name: 'Situs desa',
    color: 'teal',
    milestones: [
      { id: 'm1', title: 'Prototipe', done: false, dueDate: '2026-10-03' },
      { id: 'm2', title: 'Tanpa tanggal', done: false },
      { id: 'm3', title: 'Di luar rentang', done: false, dueDate: '2026-11-30' },
      { id: 'm4', title: 'Selesai', done: true, dueDate: '2026-10-03' },
    ],
  })
  const on = { ...filters, showMilestones: true }
  const day = (items: ReturnType<typeof buildDayItems>, iso: string) => items.get(iso)!

  it('puts dated milestones on their day, each exactly once, and skips undated or out-of-range ones', () => {
    const items = buildDayItems([], [], range, on, [project])
    expect(day(items, '2026-10-03').milestones.map((m) => m.milestone.id)).toEqual(['m1', 'm4'])
    const all = [...items.values()].flatMap((d) => d.milestones)
    expect(all).toHaveLength(2)
    expect(all[0].project.id).toBe('prj-1')
  })

  it('counts them in the day total and keeps them out of the task lists', () => {
    const items = buildDayItems([], [task('2026-10-03')], range, on, [project])
    const bucket = day(items, '2026-10-03')
    expect(bucket.count).toBe(3)
    expect(bucket.tasks).toHaveLength(1)
    expect(bucket.timedTasks).toHaveLength(0)
  })

  it('hides them when the toggle is off, and when the caller does not ask for them', () => {
    expect(day(buildDayItems([], [], range, { ...filters, showMilestones: false }, [project]), '2026-10-03').milestones).toEqual([])
    expect(day(buildDayItems([], [], range, filters, [project]), '2026-10-03').milestones).toEqual([])
    expect(day(buildDayItems([], [], range, on, [project]), '2026-10-03').count).toBe(2)
  })

  it('is independent of the tasks toggle', () => {
    const items = buildDayItems([], [task('2026-10-03')], range, { hiddenCategoryIds: [], showTasks: false, showMilestones: true }, [project])
    expect(day(items, '2026-10-03').count).toBe(2)
  })

  it('leaves out milestones of archived projects', () => {
    const items = buildDayItems([], [], range, on, [{ ...project, archivedAt: '2026-09-01T00:00:00.000Z' }])
    expect([...items.values()].flatMap((d) => d.milestones)).toEqual([])
  })
})
