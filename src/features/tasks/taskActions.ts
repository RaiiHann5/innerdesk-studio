import { taskRepo } from '@/data/repos'
import { fmt, toISODate } from '@/lib/date'
import { newTask } from '@/lib/entityDefaults'
import { placeTask } from '@/lib/reorder'
import { completesRecurring, nextOccurrence } from '@/lib/taskRecurrence'
import { useFocusStore } from '@/features/focus/store/focusStore'
import { useTaskStore } from '@/stores/entities'
import { toastWithRetry } from '@/stores/retryToast'
import { useUiStore } from '@/stores/ui'
import type { NewEntity, Task, TaskStatus } from '@/types/domain'

type TaskPatch = Partial<NewEntity<Task>>

/** Fields that must change together whenever a task moves to another status. */
export const statusPatch = (status: TaskStatus): TaskPatch => ({
  status,
  completedAt: status === 'done' ? toISODate(new Date()) : undefined,
})

const toast = (message: string, action?: { label: string; run: () => void }) => useUiStore.getState().showToast(message, action)

/**
 * Moves a task to a status. Finishing a recurring task also creates its next copy and says when it is due.
 * Every place that completes a task goes through here (board, table, panel, calendar), so a recurring task
 * repeats no matter where it was ticked off. A failed update throws; a failed follow-up task only warns.
 */
export async function changeStatus(task: Task, status: TaskStatus, extra: TaskPatch = {}): Promise<Task | null> {
  const store = useTaskStore.getState()
  const existing = store.items
  await store.update(task.id, { ...statusPatch(status), ...extra })
  if (!completesRecurring(task, status)) return null

  const next = nextOccurrence(task, existing)
  if (!next) return null
  const created = await createNext(next)
  return created
}

async function createNext(next: NewEntity<Task>): Promise<Task | null> {
  try {
    const created = await useTaskStore.getState().add(next)
    toast(`Task berulang dijadwalkan lagi untuk ${fmt(next.dueDate as string, 'EEE, d MMM')}.`)
    return created
  } catch {
    toastWithRetry('Task selesai, tetapi salinan berikutnya gagal dibuat.', () => createNext(next).then((c) => c ?? Promise.reject(new Error('gagal'))))
    return null
  }
}

/** Puts a task at `index` of a column using the order helper. Only the tasks whose order changed are written. */
export async function placeInColumn(task: Task, status: TaskStatus, index: number): Promise<void> {
  const { items, update } = useTaskStore.getState()
  const patches = placeTask(items, task.id, status, index)
  await Promise.all(
    patches.map((p) =>
      p.id === task.id && p.status ? changeStatus(task, p.status, { order: p.order }) : update(p.id, { order: p.order }),
    ),
  )
}

/** A task typed into a column's quick add. It lands at the bottom of that column. */
export function quickAddTask(title: string, status: TaskStatus, projectId?: string): Promise<Task> {
  const { items, add } = useTaskStore.getState()
  return add(newTask({ title: title.trim(), status, priority: 'medium', projectId, ...statusPatch(status) }, items))
}

/** Writes one patch per task. Resolves with the ids that failed, so the caller can say so once. */
async function writeEach(tasks: readonly Task[], patchFor: (task: Task) => Promise<unknown>): Promise<string[]> {
  const results = await Promise.allSettled(tasks.map(patchFor))
  return tasks.filter((_, i) => results[i].status === 'rejected').map((t) => t.id)
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

/** Applies a patch to many tasks. A status in the patch goes through changeStatus so recurring tasks still repeat. */
export async function bulkUpdate(tasks: readonly Task[], patchFor: (task: Task) => TaskPatch, failure = 'Sebagian task gagal diperbarui.'): Promise<void> {
  const { update } = useTaskStore.getState()
  const failed = await writeEach(tasks, (t) => {
    const patch = patchFor(t)
    return patch.status && patch.status !== t.status ? changeStatus(t, patch.status, patch) : update(t.id, patch)
  })
  if (failed.length > 0) {
    const retry = tasks.filter((t) => failed.includes(t.id))
    toastWithRetry(failure, () => bulkUpdate(retry, patchFor, failure))
  }
}

async function restoreTasks(removed: readonly Task[]): Promise<void> {
  const restored = await Promise.all(removed.map((t) => taskRepo.restore(t)))
  useTaskStore.setState((s) => ({ items: [...s.items, ...restored] }))
}

/**
 * Says what a batch did. Everything worked: the message with an undo. Some failed: the same, with a note on
 * how many did not (the undo is for the ones that did). Nothing worked: the failure alone, with a retry.
 */
function reportBatch(done: readonly Task[], failed: readonly Task[], text: { one: string; many: (n: number) => string; fail: (n: number) => string }, undo: () => void, retry: () => Promise<unknown>) {
  if (done.length === 0) {
    if (failed.length > 0) toastWithRetry(text.fail(failed.length), retry)
    return
  }
  const message = done.length === 1 ? text.one : text.many(done.length)
  toast(failed.length > 0 ? `${message} ${failed.length} lainnya gagal.` : message, { label: 'Urungkan', run: undo })
}

/** Deletes tasks and offers one undo that brings them all back with their ids and timestamps. */
export async function deleteTasksWithUndo(tasks: readonly Task[]): Promise<void> {
  const { remove } = useTaskStore.getState()
  const failedIds = new Set(await writeEach(tasks, (t) => remove(t.id)))
  const removed = tasks.filter((t) => !failedIds.has(t.id))
  const failed = tasks.filter((t) => failedIds.has(t.id))
  reportBatch(
    removed,
    failed,
    { one: 'Task dihapus.', many: (n) => `${n} task dihapus.`, fail: (n) => plural(n, 'Task gagal dihapus.', `${n} task gagal dihapus.`) },
    () => void restoreTasks(removed).catch(() => toastWithRetry('Task gagal dikembalikan.', () => restoreTasks(removed))),
    () => deleteTasksWithUndo(failed),
  )
}

export const unarchiveTask = (task: Task): Promise<void> => useTaskStore.getState().update(task.id, { archivedAt: undefined })

/** Archives tasks with an undo. Archived tasks keep their data and come back on "Pulihkan". */
export async function archiveTasksWithUndo(tasks: readonly Task[]): Promise<void> {
  if (tasks.length === 0) return
  const { update } = useTaskStore.getState()
  const archivedAt = new Date().toISOString()
  const failedIds = new Set(await writeEach(tasks, (t) => update(t.id, { archivedAt })))
  const done = tasks.filter((t) => !failedIds.has(t.id))
  const failed = tasks.filter((t) => failedIds.has(t.id))
  reportBatch(
    done,
    failed,
    { one: 'Task diarsipkan.', many: (n) => `${n} task diarsipkan.`, fail: (n) => plural(n, 'Task gagal diarsipkan.', `${n} task gagal diarsipkan.`) },
    () => void Promise.all(done.map(unarchiveTask)).catch(() => toastWithRetry('Task gagal dikembalikan.', () => Promise.all(done.map(unarchiveTask)))),
    () => archiveTasksWithUndo(failed),
  )
}

/**
 * Points the focus timer at this task so /focus opens with it selected.
 * A block that is already running is left alone: switching its task would credit the time to the wrong work.
 */
export function prepareFocus(task: Task): 'ready' | 'busy' {
  const focus = useFocusStore.getState()
  if (focus.running) return 'busy'
  // A paused or idle break would carry the task into the break, so start from a fresh focus block.
  if (focus.mode !== 'focus' && !focus.started) focus.arm('focus', focus.settings)
  useFocusStore.getState().setTask(task.id, task.projectId)
  return 'ready'
}
