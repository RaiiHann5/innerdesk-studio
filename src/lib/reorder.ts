import { compareManual } from '@/lib/taskQuery'
import type { Task, TaskStatus } from '@/types/domain'

/** Distance between neighbours when a column is numbered from scratch, and the room left at either end. */
export const ORDER_STEP = 1000
/** Two orders closer than this are treated as a tie: the column is renumbered instead of squeezing in another midpoint. */
const MIN_GAP = 0.01

/** Moves one item to another index. Returns the same array when nothing changes, so callers can skip a write. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const last = list.length - 1
  if (from < 0 || from > last) return [...list]
  const target = Math.max(0, Math.min(last, to))
  if (target === from) return [...list]
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(target, 0, item)
  return next
}

/** Where a new task goes so it lands at the end of its status column. */
export function appendOrder(tasks: readonly Task[], status: TaskStatus): number {
  let max = 0
  for (const t of tasks) if (t.status === status && t.order > max) max = t.order
  return max + ORDER_STEP
}

export interface OrderPatch {
  id: string
  order: number
  /** Present only when the task changes column. */
  status?: TaskStatus
}

/** The visible, manually ordered tasks of one column. Archived tasks are hidden, so they take no slot. */
export const columnOf = (tasks: readonly Task[], status: TaskStatus): Task[] =>
  tasks.filter((t) => t.status === status && !t.archivedAt).sort(compareManual)

/**
 * Puts a task at `index` of a column (its own or another one) and says what to write.
 *
 * Usually one patch: the task takes the midpoint between its new neighbours. When there is no room
 * (ties, or a gap under MIN_GAP) the whole column is renumbered in steps of ORDER_STEP. A move that
 * changes nothing returns no patches. The result depends only on the input, never on the clock.
 */
export function placeTask(tasks: readonly Task[], id: string, status: TaskStatus, index: number): OrderPatch[] {
  const moved = tasks.find((t) => t.id === id)
  if (!moved) return []

  const column = columnOf(tasks, status)
  const from = column.findIndex((t) => t.id === id)
  const rest = column.filter((t) => t.id !== id)
  const at = Math.max(0, Math.min(rest.length, index))
  if (from === at && moved.status === status) return []

  const before = rest[at - 1]
  const after = rest[at]
  const crossing = moved.status !== status
  const withStatus = (patch: OrderPatch): OrderPatch => (crossing ? { ...patch, status } : patch)

  let order: number | null
  if (!before && !after) order = ORDER_STEP
  else if (!before) order = after.order - ORDER_STEP
  else if (!after) order = before.order + ORDER_STEP
  else order = after.order - before.order >= MIN_GAP * 2 ? (before.order + after.order) / 2 : null

  if (order !== null) return [withStatus({ id, order })]

  const sequence = [...rest.slice(0, at), moved, ...rest.slice(at)]
  const patches: OrderPatch[] = []
  sequence.forEach((task, i) => {
    const next = (i + 1) * ORDER_STEP
    if (task.id === id) patches.push(withStatus({ id, order: next }))
    else if (task.order !== next) patches.push({ id: task.id, order: next })
  })
  return patches
}
