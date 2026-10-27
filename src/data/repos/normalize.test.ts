import { describe, expect, it } from 'vitest'
import { makeProject, makeTask } from '@/lib/testing'
import type { Project, Task } from '@/types/domain'
import { defaultProjectColor, normalizeProject, normalizeTasks } from './normalize'

/** A task as it was stored before subtasks, order and the rest existed. */
const legacyTask = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'TSK-1',
    title: 'Lama',
    status: 'todo',
    priority: 'medium',
    tags: ['a'],
    noteCount: 1,
    timeLog: [{ date: '2026-10-01', minutes: 30 }],
    focusCount: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  }) as unknown as Task

const legacyProject = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'prj-lama',
    name: 'Lama',
    status: 'active',
    phase: 'riset',
    deadline: '2026-12-01',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as unknown as Project

describe('normalizeTasks', () => {
  it('fills the new fields on a task stored without them and leaves the old ones alone', () => {
    const [task] = normalizeTasks([legacyTask()])
    expect(task).toMatchObject({ id: 'TSK-1', title: 'Lama', tags: ['a'], noteCount: 1, focusCount: 2, subtasks: [], order: 1000 })
    expect(task.timeLog).toEqual([{ date: '2026-10-01', minutes: 30 }])
    expect(task).not.toHaveProperty('estimateMinutes')
    expect(task).not.toHaveProperty('recurrence')
    expect(task).not.toHaveProperty('archivedAt')
  })

  it('also repairs older gaps: missing tags, time log and counters', () => {
    const [task] = normalizeTasks([legacyTask({ tags: undefined, timeLog: undefined, noteCount: undefined, focusCount: undefined })])
    expect(task).toMatchObject({ tags: [], timeLog: [], noteCount: 0, focusCount: 0 })
  })

  it('keeps values the person already set', () => {
    const set = makeTask({
      estimateMinutes: 90,
      recurrence: { freq: 'weekly', interval: 2 },
      order: 42,
      archivedAt: '2026-10-01T00:00:00.000Z',
      subtasks: [{ id: 's1', title: 'Satu', done: true }],
    })
    expect(normalizeTasks([set])[0]).toEqual(set)
  })

  it('numbers tasks with no order per status column by creation time, keeping the board as it was', () => {
    const result = normalizeTasks([
      legacyTask({ id: 'B', createdAt: '2026-02-01T00:00:00.000Z' }),
      legacyTask({ id: 'A', createdAt: '2026-01-01T00:00:00.000Z' }),
      legacyTask({ id: 'C', status: 'done', createdAt: '2026-03-01T00:00:00.000Z' }),
    ])
    const byId = Object.fromEntries(result.map((t) => [t.id, t.order]))
    expect(byId).toEqual({ A: 1000, B: 2000, C: 1000 })
  })

  it('places a task with no order after the ones that have one', () => {
    const result = normalizeTasks([makeTask({ id: 'kept', order: 5000 }), legacyTask({ id: 'new' })])
    expect(result.find((t) => t.id === 'new')?.order).toBe(6000)
    expect(result.find((t) => t.id === 'kept')?.order).toBe(5000)
  })

  it('drops subtasks without a title, gives missing ids, and reads done strictly', () => {
    const [task] = normalizeTasks([legacyTask({ subtasks: [{ title: 'Ok' }, { id: 'x', title: '  ' }, 'bukan objek', { id: 'y', title: 'Dua', done: 'ya' }] })])
    expect(task.subtasks).toEqual([
      { id: 'TSK-1-s1', title: 'Ok', done: false },
      { id: 'y', title: 'Dua', done: false },
    ])
  })

  it('drops an unknown recurrence and repairs a bad interval', () => {
    expect(normalizeTasks([legacyTask({ recurrence: { freq: 'yearly', interval: 1 } })])[0]).not.toHaveProperty('recurrence')
    expect(normalizeTasks([legacyTask({ recurrence: { freq: 'daily', interval: 0 } })])[0].recurrence).toEqual({ freq: 'daily', interval: 1 })
    expect(normalizeTasks([legacyTask({ recurrence: { freq: 'weekly' } })])[0].recurrence).toEqual({ freq: 'weekly', interval: 1 })
  })

  it('rejects an estimate that is not a positive number', () => {
    expect(normalizeTasks([legacyTask({ estimateMinutes: -5 })])[0]).not.toHaveProperty('estimateMinutes')
    expect(normalizeTasks([legacyTask({ estimateMinutes: '30' })])[0]).not.toHaveProperty('estimateMinutes')
    expect(normalizeTasks([legacyTask({ estimateMinutes: 45.4 })])[0].estimateMinutes).toBe(45)
  })

  it('is idempotent and does not mutate its input', () => {
    const input = [legacyTask({ id: 'B', createdAt: '2026-02-01T00:00:00.000Z' }), legacyTask({ id: 'A' })]
    const snapshot = JSON.stringify(input)
    const once = normalizeTasks(input)
    expect(JSON.stringify(input)).toBe(snapshot)
    expect(normalizeTasks(once)).toEqual(once)
  })
})

describe('normalizeProject', () => {
  it('fills colour, milestones and links on a project stored without them', () => {
    const project = normalizeProject(legacyProject())
    expect(project).toMatchObject({ id: 'prj-lama', name: 'Lama', deadline: '2026-12-01', milestones: [], links: [] })
    expect(project.color).toBe(defaultProjectColor('prj-lama'))
    expect(project).not.toHaveProperty('startDate')
    expect(project).not.toHaveProperty('goal')
    expect(project).not.toHaveProperty('archivedAt')
  })

  it('picks the same colour for the same id every time, from the six tokens', () => {
    expect(defaultProjectColor('prj-a')).toBe(defaultProjectColor('prj-a'))
    const colours = new Set(Array.from({ length: 40 }, (_, i) => defaultProjectColor(`prj-${i}`)))
    expect(colours.size).toBeGreaterThan(1)
    for (const c of colours) expect(['moss', 'ochre', 'clay', 'teal', 'slate', 'rosewood']).toContain(c)
  })

  it('keeps what is set', () => {
    const set = makeProject({
      color: 'teal',
      startDate: '2026-09-01',
      goal: 'Tujuan',
      archivedAt: '2026-10-01T00:00:00.000Z',
      milestones: [{ id: 'm1', title: 'A', dueDate: '2026-10-20', done: true }],
      links: [{ id: 'l1', title: 'Repo', url: 'https://github.com/x/y', kind: 'dokumen' }],
    })
    expect(normalizeProject(set)).toEqual(set)
  })

  it('replaces an unknown colour, drops a bad date and keeps undated milestones', () => {
    const project = normalizeProject(
      legacyProject({ color: 'neon', startDate: '1 Oktober', milestones: [{ title: 'Tanpa tanggal', dueDate: 'besok' }, { title: '' }] }),
    )
    expect(project.color).toBe(defaultProjectColor('prj-lama'))
    expect(project).not.toHaveProperty('startDate')
    expect(project.milestones).toEqual([{ id: 'prj-lama-m1', title: 'Tanpa tanggal', done: false }])
  })

  it('reads links defensively: no url is dropped, an unknown kind is lainnya, a missing title falls back to the url', () => {
    const project = normalizeProject(
      legacyProject({
        links: [{ title: 'Tanpa url' }, { url: 'https://figma.com/file/1', kind: 'ruang rahasia' }, { id: 'ok', title: 'Akun', url: 'https://x.test', kind: 'akun' }],
      }),
    )
    expect(project.links).toEqual([
      { id: 'prj-lama-l2', title: 'https://figma.com/file/1', url: 'https://figma.com/file/1', kind: 'lainnya' },
      { id: 'ok', title: 'Akun', url: 'https://x.test', kind: 'akun' },
    ])
  })

  it('is idempotent', () => {
    const once = normalizeProject(legacyProject())
    expect(normalizeProject(once)).toEqual(once)
  })
})
