import { describe, expect, it } from 'vitest'
import { makeProject, makeTask } from '@/lib/testing'
import { globalStatItems, projectStatItems, summarizeTasks } from './taskStats'

const TODAY = '2026-10-14'
const ARCHIVED = '2026-10-01T00:00:00.000Z'

describe('summarizeTasks', () => {
  it('counts total, open, done, overdue and percent', () => {
    const s = summarizeTasks(
      [
        makeTask({ id: 'a', status: 'done' }),
        makeTask({ id: 'b', dueDate: '2026-10-13' }),
        makeTask({ id: 'c', dueDate: TODAY }),
        makeTask({ id: 'd', status: 'done', dueDate: '2026-10-01' }),
      ],
      TODAY,
    )
    expect(s).toEqual({ total: 4, done: 2, open: 2, overdue: 1, archivedDone: 0, percent: 50 })
  })

  it('is 0% with no tasks', () => {
    expect(summarizeTasks([], TODAY).percent).toBe(0)
  })

  it('hides archived tasks from total, open and overdue', () => {
    const s = summarizeTasks([makeTask({ id: 'a', dueDate: '2026-10-01', archivedAt: ARCHIVED }), makeTask({ id: 'b' })], TODAY)
    expect(s).toMatchObject({ total: 1, open: 1, overdue: 0, percent: 0 })
  })

  it('keeps archived finished work in the percent, so archiving does not lower it', () => {
    const before = summarizeTasks([makeTask({ id: 'a', status: 'done' }), makeTask({ id: 'b' })], TODAY)
    const after = summarizeTasks([makeTask({ id: 'a', status: 'done', archivedAt: ARCHIVED }), makeTask({ id: 'b' })], TODAY)
    expect(before.percent).toBe(50)
    expect(after.percent).toBe(50)
    expect(after).toMatchObject({ total: 1, archivedDone: 1 })
  })

  it('ignores archived work that was never finished', () => {
    const s = summarizeTasks([makeTask({ id: 'a', archivedAt: ARCHIVED }), makeTask({ id: 'b', status: 'done' })], TODAY)
    expect(s.percent).toBe(100)
  })
})

describe('stat rows', () => {
  it('global: active projects exclude archived ones', () => {
    const items = globalStatItems([], [makeProject({ id: 'a' }), makeProject({ id: 'b', archivedAt: ARCHIVED }), makeProject({ id: 'c', status: 'paused' })])
    expect(items[0]).toEqual({ label: 'Project aktif', value: '1' })
  })

  it('project row reads the same summary', () => {
    const items = projectStatItems([makeTask({ status: 'done' }), makeTask({ id: 'b' })])
    expect(items.map((i) => i.value)).toEqual(['2', '1', '50%', '0'])
  })
})

describe('projectStatItems with the project progress', () => {
  it('shows the progress it is given, so the row agrees with the project card', () => {
    const tasks = [makeTask({ status: 'done' }), makeTask({ id: 'b' })]
    expect(projectStatItems(tasks).find((i) => i.label === 'Selesai')?.value).toBe('50%')
    expect(projectStatItems(tasks, 33).find((i) => i.label === 'Selesai')?.value).toBe('33%')
    expect(projectStatItems(tasks, 0).find((i) => i.label === 'Selesai')?.value).toBe('0%')
  })
})
