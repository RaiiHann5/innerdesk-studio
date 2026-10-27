// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_PREFIX } from '@/lib/config'
import { makeProject, makeTask } from '@/lib/testing'
import { useProjectStore, useTaskStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { Project, Task } from '@/types/domain'
import { advancePhase, archiveProjectWithUndo, duplicateProjectWithUndo, saveLinks, saveMilestones, toggleMilestoneDone, unarchiveProject } from './projectActions'

async function load(projects: Project[], tasks: Task[] = []) {
  localStorage.setItem(STORAGE_PREFIX + 'projects', JSON.stringify(projects))
  localStorage.setItem(STORAGE_PREFIX + 'tasks', JSON.stringify(tasks))
  await Promise.all([useProjectStore.getState().load(), useTaskStore.getState().load()])
}
const projects = () => useProjectStore.getState().items
const byId = (id: string) => projects().find((p) => p.id === id) as Project
const toast = () => useUiStore.getState().toast

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  localStorage.clear()
  useUiStore.setState({ toast: null })
})

describe('milestones and links', () => {
  it('saves a milestone list and a link list', async () => {
    await load([makeProject({ id: 'p1' })])
    await saveMilestones(byId('p1'), [{ id: 'm1', title: 'Satu', done: false }])
    await saveLinks(byId('p1'), [{ id: 'l1', title: 'Figma', url: 'https://figma.com/x', kind: 'desain' }])
    expect(byId('p1').milestones).toHaveLength(1)
    expect(byId('p1').links[0].title).toBe('Figma')
  })

  it('toggles a milestone from the freshest list, not from a stale copy', async () => {
    await load([makeProject({ id: 'p1', milestones: [{ id: 'm1', title: 'Satu', done: false }] })])
    await saveMilestones(byId('p1'), [{ id: 'm1', title: 'Satu', done: false }, { id: 'm2', title: 'Dua', done: false }])
    await toggleMilestoneDone('p1', 'm1')
    expect(byId('p1').milestones.map((m) => [m.id, m.done])).toEqual([['m1', true], ['m2', false]])
  })

  it('ignores a toggle for a project that is gone', async () => {
    await load([])
    await expect(toggleMilestoneDone('nope', 'm1')).resolves.toBeUndefined()
  })
})

describe('advancePhase', () => {
  it('moves to the next phase and stops at the last', async () => {
    await load([makeProject({ id: 'p1', phase: 'pengembangan' })])
    expect(await advancePhase(byId('p1'))).toBe('peluncuran')
    expect(byId('p1').phase).toBe('peluncuran')
    expect(await advancePhase(byId('p1'))).toBeNull()
    expect(byId('p1').phase).toBe('peluncuran')
  })
})

describe('archive', () => {
  it('archives with an undo, and un-archives', async () => {
    await load([makeProject({ id: 'p1' })])
    await archiveProjectWithUndo(byId('p1'))
    expect(byId('p1').archivedAt).toBeTruthy()
    expect(toast()?.message).toBe('Project diarsipkan.')
    toast()?.action?.run()
    await vi.waitFor(() => expect(byId('p1').archivedAt).toBeUndefined())
    await archiveProjectWithUndo(byId('p1'))
    await unarchiveProject(byId('p1'))
    expect(byId('p1').archivedAt).toBeUndefined()
  })
})

describe('duplicateProjectWithUndo', () => {
  const original = makeProject({
    id: 'p1',
    name: 'Situs',
    milestones: [{ id: 'm1', title: 'Rilis', done: true, dueDate: '2026-10-01' }],
    links: [{ id: 'l1', title: 'Figma', url: 'https://figma.com/x', kind: 'desain' }],
  })
  const tasks = [
    makeTask({ id: 'TSK-1', projectId: 'p1', title: 'Selesai', status: 'done', dueDate: '2026-10-01', order: 1000 }),
    makeTask({ id: 'TSK-2', projectId: 'p1', title: 'Berjalan', status: 'doing', order: 2000, subtasks: [{ id: 's', title: 'x', done: true }] }),
    makeTask({ id: 'TSK-3', projectId: 'other', title: 'Milik lain' }),
  ]

  it('creates the copy and its tasks, and leaves the original alone', async () => {
    await load([original], tasks)
    const copy = await duplicateProjectWithUndo(byId('p1'))
    expect(copy.id).not.toBe('p1')
    expect(copy.name).toBe('Situs (salinan)')
    expect(byId(copy.id).milestones.map((m) => [m.title, m.done])).toEqual([['Rilis', false]])
    const copied = useTaskStore.getState().items.filter((t) => t.projectId === copy.id)
    expect(copied.map((t) => [t.title, t.status, t.dueDate])).toEqual([['Berjalan', 'todo', undefined], ['Selesai', 'todo', undefined]])
    expect(copied[0].subtasks.every((s) => !s.done)).toBe(true)
    expect(byId('p1').milestones[0].done).toBe(true)
    expect(useTaskStore.getState().items.filter((t) => t.projectId === 'p1')).toHaveLength(2)
    expect(toast()?.message).toBe('Project diduplikasi.')
  })

  it('undo removes the copy and its tasks, and nothing else', async () => {
    await load([original], tasks)
    const copy = await duplicateProjectWithUndo(byId('p1'))
    toast()?.action?.run()
    await vi.waitFor(() => expect(projects().some((p) => p.id === copy.id)).toBe(false))
    await vi.waitFor(() => expect(useTaskStore.getState().items.map((t) => t.id).sort()).toEqual(['TSK-1', 'TSK-2', 'TSK-3']))
  })

  it('removes a half-made copy when a task fails to copy', async () => {
    await load([original], tasks)
    const realAdd = useTaskStore.getState().add
    let calls = 0
    useTaskStore.setState({ add: (draft) => (++calls === 2 ? Promise.reject(new Error('putus')) : realAdd(draft)) })
    await expect(duplicateProjectWithUndo(byId('p1'))).rejects.toThrow('putus')
    useTaskStore.setState({ add: realAdd })
    expect(projects().map((p) => p.id)).toEqual(['p1'])
    expect(useTaskStore.getState().items.map((t) => t.id).sort()).toEqual(['TSK-1', 'TSK-2', 'TSK-3'])
  })
})
