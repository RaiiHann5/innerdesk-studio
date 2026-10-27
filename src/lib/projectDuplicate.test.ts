import { describe, expect, it } from 'vitest'
import { makeProject, makeTask } from '@/lib/testing'
import { planDuplicate } from './projectDuplicate'

let n = 0
const id = () => `x${++n}`

const project = makeProject({
  id: 'prj-1',
  name: 'Situs desa',
  description: 'Deskripsi',
  goal: 'Warga mengurus surat dari rumah',
  color: 'teal',
  phase: 'pengembangan',
  status: 'paused',
  startDate: '2026-01-01',
  deadline: '2026-12-01',
  milestones: [
    { id: 'm1', title: 'Prototipe', done: true, dueDate: '2026-02-01' },
    { id: 'm2', title: 'Rilis', done: false, dueDate: '2026-12-01' },
  ],
  links: [{ id: 'l1', title: 'Figma', url: 'https://figma.com/x', kind: 'desain' }],
})

describe('planDuplicate', () => {
  const tasks = [
    makeTask({ id: 'TSK-1', projectId: 'prj-1', title: 'Selesai', status: 'done', order: 1000, dueDate: '2026-02-01', completedAt: '2026-02-01', timeLog: [{ date: '2026-02-01', minutes: 60 }], focusCount: 2, noteCount: 3 }),
    makeTask({ id: 'TSK-2', projectId: 'prj-1', title: 'Dikerjakan', status: 'doing', order: 2000, dueDate: '2026-03-01', dueTime: '10:00', recurrence: { freq: 'weekly', interval: 1 }, estimateMinutes: 90, tags: ['a'], priority: 'high', subtasks: [{ id: 's1', title: 'Sub', done: true }] }),
    makeTask({ id: 'TSK-3', projectId: 'prj-1', title: 'Belum', status: 'todo', order: 500 }),
    makeTask({ id: 'TSK-4', projectId: 'prj-1', title: 'Diarsipkan', archivedAt: '2026-01-01T00:00:00.000Z' }),
    makeTask({ id: 'TSK-5', projectId: 'prj-other', title: 'Milik lain' }),
  ]
  const plan = planDuplicate(project, tasks, id)

  it('copies the plan of the project and none of its history or dates', () => {
    expect(plan.project).toMatchObject({ name: 'Situs desa (salinan)', description: 'Deskripsi', goal: 'Warga mengurus surat dari rumah', color: 'teal', status: 'active', phase: 'riset' })
    expect('startDate' in plan.project).toBe(false)
    expect('deadline' in plan.project).toBe(false)
    expect('archivedAt' in plan.project).toBe(false)
  })

  it('copies milestones unchecked, without dates, with new ids', () => {
    expect(plan.project.milestones.map((m) => [m.title, m.done, m.dueDate])).toEqual([['Prototipe', false, undefined], ['Rilis', false, undefined]])
    expect(plan.project.milestones.every((m) => !project.milestones.some((o) => o.id === m.id))).toBe(true)
  })

  it('copies links with new ids', () => {
    expect(plan.project.links).toHaveLength(1)
    expect(plan.project.links[0]).toMatchObject({ title: 'Figma', url: 'https://figma.com/x', kind: 'desain' })
    expect(plan.project.links[0].id).not.toBe('l1')
  })

  it('copies this project\'s live tasks as todo with no dates, recurrence, time or counts', () => {
    expect(plan.tasks.map((t) => t.title)).toEqual(['Dikerjakan', 'Belum', 'Selesai'])
    for (const t of plan.tasks) {
      expect(t.status).toBe('todo')
      expect(t.timeLog).toEqual([])
      expect([t.focusCount, t.noteCount]).toEqual([0, 0])
      expect(['dueDate', 'dueTime', 'completedAt', 'recurrence', 'archivedAt'].some((k) => k in t)).toBe(false)
    }
    expect(plan.tasks[0]).toMatchObject({ priority: 'high', estimateMinutes: 90, tags: ['a'] })
  })

  it('resets subtasks to unchecked with new ids, and numbers the order from 1000', () => {
    expect(plan.tasks[0].subtasks).toEqual([{ id: expect.any(String), title: 'Sub', done: false }])
    expect(plan.tasks[0].subtasks[0].id).not.toBe('s1')
    expect(plan.tasks.map((t) => t.order)).toEqual([1000, 2000, 3000])
  })

  it('does not change the original', () => {
    expect(project.milestones[0].done).toBe(true)
    expect(tasks[1].status).toBe('doing')
  })

  it('handles a project with nothing in it', () => {
    const empty = planDuplicate(makeProject({ id: 'p' }), [], id)
    expect(empty.tasks).toEqual([])
    expect(empty.project.milestones).toEqual([])
  })
})
