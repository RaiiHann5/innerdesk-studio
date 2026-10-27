import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_PREFIX } from '@/lib/config'
import type { Project, Task } from '@/types/domain'
import { normalizeProjects, normalizeTasks } from '../normalize'
import { createLocalRepo } from './createLocalRepo'

const memory = new Map<string, string>()
const writes: string[] = []

beforeEach(() => {
  memory.clear()
  writes.length = 0
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      writes.push(key)
      memory.set(key, value)
    },
  })
})

const KEY = STORAGE_PREFIX + 'tasks-test'
/** Exactly what an older build stored: no subtasks, order, estimate, recurrence or archive. */
const oldRecord = {
  id: 'TSK-3',
  title: 'Data lama',
  status: 'doing',
  priority: 'high',
  tags: ['x'],
  noteCount: 0,
  timeLog: [],
  focusCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const makeRepo = () => createLocalRepo<Task>({ key: 'tasks-test', seed: () => [], makeId: () => 'TSK-new', normalize: normalizeTasks })

describe('local repo with defaults on read', () => {
  it('loads data stored before the new fields existed, with defaults filled in', async () => {
    memory.set(KEY, JSON.stringify([oldRecord]))
    const [task] = await makeRepo().list()
    expect(task).toMatchObject({ id: 'TSK-3', title: 'Data lama', status: 'doing', subtasks: [], order: 1000 })
  })

  it('does not rewrite stored data just because it was read', async () => {
    memory.set(KEY, JSON.stringify([oldRecord]))
    const repo = makeRepo()
    await repo.list()
    await repo.get('TSK-3')
    expect(writes).toEqual([])
    expect(JSON.parse(memory.get(KEY) as string)).toEqual([oldRecord])
  })

  it('writes the filled-in shape on the next normal save, without losing anything', async () => {
    memory.set(KEY, JSON.stringify([oldRecord]))
    const repo = makeRepo()
    await repo.update('TSK-3', { title: 'Baru' })
    const [stored] = JSON.parse(memory.get(KEY) as string)
    expect(stored).toMatchObject({ id: 'TSK-3', title: 'Baru', tags: ['x'], subtasks: [], order: 1000, createdAt: oldRecord.createdAt })
  })

  it('round-trips the new fields', async () => {
    const repo = makeRepo()
    const created = await repo.create({
      title: 'Baru',
      status: 'todo',
      priority: 'low',
      tags: [],
      noteCount: 0,
      timeLog: [],
      focusCount: 0,
      subtasks: [{ id: 's1', title: 'Satu', done: false }],
      order: 2000,
      estimateMinutes: 30,
      recurrence: { freq: 'daily', interval: 1 },
    })
    const loaded = await repo.get(created.id)
    expect(loaded).toMatchObject({ subtasks: [{ id: 's1', title: 'Satu', done: false }], order: 2000, estimateMinutes: 30, recurrence: { freq: 'daily', interval: 1 } })
  })

  it('applies defaults to seeded data too', async () => {
    const repo = createLocalRepo<Project>({
      key: 'projects-test',
      seed: () => [{ name: 'Seed', status: 'active', phase: 'riset' } as never],
      makeId: () => 'prj-seed',
      normalize: normalizeProjects,
    })
    const [project] = await repo.list()
    expect(project).toMatchObject({ id: 'prj-seed', milestones: [], links: [] })
    expect(project.color).toBeTruthy()
  })
})
