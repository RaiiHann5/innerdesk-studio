import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_PREFIX } from '@/lib/config'
import { isoDay } from '@/lib/date'
import { makeTask } from '@/lib/testing'
import { useFocusStore } from '@/features/focus/store/focusStore'
import { useTaskStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { Task } from '@/types/domain'
import {
  archiveTasksWithUndo,
  bulkUpdate,
  changeStatus,
  deleteTasksWithUndo,
  placeInColumn,
  prepareFocus,
  quickAddTask,
} from './taskActions'

const memory = new Map<string, string>()

async function load(tasks: Task[]) {
  memory.set(STORAGE_PREFIX + 'tasks', JSON.stringify(tasks))
  await useTaskStore.getState().load()
}
const tasks = () => useTaskStore.getState().items
const byId = (id: string) => tasks().find((t) => t.id === id) as Task
const toast = () => useUiStore.getState().toast

beforeEach(() => {
  memory.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
  })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  useUiStore.setState({ toast: null })
})

describe('changeStatus', () => {
  it('moves a task and stamps completedAt only for done', async () => {
    await load([makeTask({ id: 'TSK-1' })])
    await changeStatus(byId('TSK-1'), 'done')
    expect(byId('TSK-1').status).toBe('done')
    expect(byId('TSK-1').completedAt).toBeTruthy()
    await changeStatus(byId('TSK-1'), 'doing')
    expect(byId('TSK-1').completedAt).toBeUndefined()
  })

  it('creates the next copy of a recurring task and says when it is due', async () => {
    const due = isoDay(0)
    await load([
      makeTask({ id: 'TSK-1', title: 'Rekap mingguan', dueDate: due, recurrence: { freq: 'weekly', interval: 1 }, subtasks: [{ id: 's1', title: 'A', done: true }] }),
    ])
    const created = await changeStatus(byId('TSK-1'), 'done')
    expect(created).toMatchObject({ title: 'Rekap mingguan', status: 'todo', dueDate: isoDay(7) })
    expect(created?.subtasks).toEqual([{ id: 's1', title: 'A', done: false }])
    expect(tasks()).toHaveLength(2)
    expect(toast()?.message).toMatch(/dijadwalkan lagi/)
  })

  it('does not repeat when a finished recurring task is reopened or a plain task is finished', async () => {
    await load([makeTask({ id: 'TSK-1', status: 'done', recurrence: { freq: 'daily', interval: 1 } }), makeTask({ id: 'TSK-2' })])
    expect(await changeStatus(byId('TSK-1'), 'todo')).toBeNull()
    expect(await changeStatus(byId('TSK-2'), 'done')).toBeNull()
    expect(tasks()).toHaveLength(2)
  })

  it('does not stack a duplicate when a task is reopened and finished again', async () => {
    await load([makeTask({ id: 'TSK-1', dueDate: isoDay(0), recurrence: { freq: 'weekly', interval: 1 } })])
    await changeStatus(byId('TSK-1'), 'done')
    await changeStatus(byId('TSK-1'), 'todo')
    await changeStatus(byId('TSK-1'), 'done')
    expect(tasks()).toHaveLength(2)
  })
})

describe('placeInColumn', () => {
  it('reorders inside a column and writes only the moved task', async () => {
    await load([makeTask({ id: 'TSK-1', order: 1000 }), makeTask({ id: 'TSK-2', order: 2000 }), makeTask({ id: 'TSK-3', order: 3000 })])
    await placeInColumn(byId('TSK-3'), 'todo', 0)
    expect(byId('TSK-3').order).toBeLessThan(1000)
    expect(byId('TSK-1').order).toBe(1000)
    expect(byId('TSK-2').order).toBe(2000)
  })

  it('moves across columns and completes the task when it lands in done', async () => {
    await load([makeTask({ id: 'TSK-1' }), makeTask({ id: 'TSK-2', status: 'done', order: 1000 })])
    await placeInColumn(byId('TSK-1'), 'done', 1)
    expect(byId('TSK-1')).toMatchObject({ status: 'done' })
    expect(byId('TSK-1').completedAt).toBeTruthy()
    expect(byId('TSK-1').order).toBeGreaterThan(1000)
  })
})

describe('quickAddTask', () => {
  it('lands at the bottom of its column with the project, and finished when added to done', async () => {
    await load([makeTask({ id: 'TSK-1', order: 4000 })])
    const added = await quickAddTask('  Tulis catatan rilis ', 'todo', 'prj-1')
    expect(added).toMatchObject({ title: 'Tulis catatan rilis', status: 'todo', projectId: 'prj-1', order: 5000 })
    const done = await quickAddTask('Sudah beres', 'done')
    expect(done.completedAt).toBeTruthy()
  })
})

describe('bulkUpdate', () => {
  it('applies a patch to every task and sends status through changeStatus', async () => {
    await load([makeTask({ id: 'TSK-1', dueDate: isoDay(0), recurrence: { freq: 'daily', interval: 1 } }), makeTask({ id: 'TSK-2' })])
    await bulkUpdate([byId('TSK-1'), byId('TSK-2')], () => ({ status: 'done' }))
    expect(byId('TSK-1').status).toBe('done')
    expect(byId('TSK-2').status).toBe('done')
    expect(tasks()).toHaveLength(3)
  })

  it('computes the patch per task, so tags can be merged', async () => {
    await load([makeTask({ id: 'TSK-1', tags: ['a'] }), makeTask({ id: 'TSK-2' })])
    await bulkUpdate([byId('TSK-1'), byId('TSK-2')], (t) => ({ tags: [...t.tags, 'b'] }))
    expect(byId('TSK-1').tags).toEqual(['a', 'b'])
    expect(byId('TSK-2').tags).toEqual(['b'])
  })

  it('warns once when some writes fail', async () => {
    await load([makeTask({ id: 'TSK-1' })])
    await bulkUpdate([byId('TSK-1'), makeTask({ id: 'TSK-404' })], () => ({ priority: 'low' }))
    expect(byId('TSK-1').priority).toBe('low')
    expect(toast()?.message).toBe('Sebagian task gagal diperbarui.')
  })
})

describe('delete and archive with undo', () => {
  it('deletes and brings back with the same id and timestamps', async () => {
    await load([makeTask({ id: 'TSK-1' }), makeTask({ id: 'TSK-2' })])
    const originals = [byId('TSK-1'), byId('TSK-2')]
    await deleteTasksWithUndo(originals)
    expect(tasks()).toHaveLength(0)
    expect(toast()?.message).toBe('2 task dihapus.')
    toast()?.action?.run()
    await vi.waitFor(() => expect(tasks()).toHaveLength(2))
    expect(byId('TSK-1')).toEqual(originals[0])
  })

  it('archives and un-archives with undo', async () => {
    await load([makeTask({ id: 'TSK-1', status: 'done' })])
    await archiveTasksWithUndo([byId('TSK-1')])
    expect(byId('TSK-1').archivedAt).toBeTruthy()
    expect(toast()?.message).toBe('Task diarsipkan.')
    toast()?.action?.run()
    await vi.waitFor(() => expect(byId('TSK-1').archivedAt).toBeUndefined())
  })
})

describe('prepareFocus', () => {
  beforeEach(() => {
    useFocusStore.setState({ running: false, started: false, mode: 'focus', taskId: undefined, projectId: undefined })
  })

  it('selects the task for the timer', () => {
    expect(prepareFocus(makeTask({ id: 'TSK-9', projectId: 'prj-1' }))).toBe('ready')
    expect(useFocusStore.getState()).toMatchObject({ taskId: 'TSK-9', projectId: 'prj-1' })
  })

  it('leaves a running block alone', () => {
    useFocusStore.setState({ running: true, taskId: 'TSK-1' })
    expect(prepareFocus(makeTask({ id: 'TSK-9' }))).toBe('busy')
    expect(useFocusStore.getState().taskId).toBe('TSK-1')
  })

  it('starts a fresh focus block when an idle break was showing', () => {
    useFocusStore.setState({ mode: 'short', started: false })
    prepareFocus(makeTask({ id: 'TSK-9' }))
    expect(useFocusStore.getState()).toMatchObject({ mode: 'focus', taskId: 'TSK-9' })
  })
})

describe('failures offer a retry', () => {
  it('a bulk update that partly fails offers to retry only the ones that failed', async () => {
    await load([makeTask({ id: 'TSK-1' })])
    const ghost = makeTask({ id: 'TSK-404' })
    await bulkUpdate([byId('TSK-1'), ghost], () => ({ priority: 'low' }))
    expect(toast()?.action?.label).toBe('Coba lagi')
    // The missing task now exists, so the retry succeeds.
    await load([makeTask({ id: 'TSK-1', priority: 'low' }), ghost])
    toast()?.action?.run()
    await vi.waitFor(() => expect(byId('TSK-404').priority).toBe('low'))
  })

  /** Makes removing the named tasks fail, the way a broken connection would. */
  const failRemoving = (...ids: string[]) => {
    const real = useTaskStore.getState().remove
    useTaskStore.setState({ remove: (id) => (ids.includes(id) ? Promise.reject(new Error('putus')) : real(id)) })
    return () => useTaskStore.setState({ remove: real })
  }

  it('a delete where some tasks fail still offers undo for the ones that went, and says how many did not', async () => {
    await load([makeTask({ id: 'TSK-1' }), makeTask({ id: 'TSK-2' })])
    const originals = [byId('TSK-1'), byId('TSK-2')]
    failRemoving('TSK-2')
    await deleteTasksWithUndo(originals)
    expect(toast()?.message).toBe('Task dihapus. 1 lainnya gagal.')
    expect(toast()?.action?.label).toBe('Urungkan')
    expect(tasks().map((t) => t.id)).toEqual(['TSK-2'])
    toast()?.action?.run()
    await vi.waitFor(() => expect(tasks().map((t) => t.id).sort()).toEqual(['TSK-1', 'TSK-2']))
  })

  it('a delete where nothing works offers a retry, and the retry deletes once the connection is back', async () => {
    await load([makeTask({ id: 'TSK-1' })])
    const restore = failRemoving('TSK-1')
    await deleteTasksWithUndo([byId('TSK-1')])
    expect(toast()?.message).toBe('Task gagal dihapus.')
    expect(toast()?.action?.label).toBe('Coba lagi')
    restore()
    toast()?.action?.run()
    await vi.waitFor(() => expect(tasks()).toHaveLength(0))
    expect(toast()?.message).toBe('Task dihapus.')
  })

  it('an archive where some tasks fail says so and keeps the undo', async () => {
    await load([makeTask({ id: 'TSK-1' })])
    await archiveTasksWithUndo([byId('TSK-1'), makeTask({ id: 'TSK-404' })])
    expect(byId('TSK-1').archivedAt).toBeTruthy()
    expect(toast()?.message).toBe('Task diarsipkan. 1 lainnya gagal.')
    expect(toast()?.action?.label).toBe('Urungkan')
  })

  it('a recurring task whose next copy fails to save offers to create it again', async () => {
    await load([makeTask({ id: 'TSK-1', dueDate: isoDay(0), recurrence: { freq: 'weekly', interval: 1 } })])
    const realAdd = useTaskStore.getState().add
    useTaskStore.setState({ add: () => Promise.reject(new Error('putus')) })
    expect(await changeStatus(byId('TSK-1'), 'done')).toBeNull()
    expect(toast()?.message).toBe('Task selesai, tetapi salinan berikutnya gagal dibuat.')
    useTaskStore.setState({ add: realAdd })
    toast()?.action?.run()
    await vi.waitFor(() => expect(tasks()).toHaveLength(2))
    expect(toast()?.message).toMatch(/dijadwalkan lagi/)
  })
})
