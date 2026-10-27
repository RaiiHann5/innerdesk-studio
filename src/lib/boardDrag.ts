import { STATUS_LABEL } from '@/lib/labels'
import { columnOf, moveItem } from '@/lib/reorder'
import { sortManual } from '@/lib/taskQuery'
import type { Task, TaskStatus } from '@/types/domain'

export const BOARD_STATUSES = Object.keys(STATUS_LABEL) as TaskStatus[]

export const isBoardStatus = (value: unknown): value is TaskStatus => BOARD_STATUSES.includes(value as TaskStatus)

/** Task ids per column, in manual order. What the board draws, and what a drag rearranges before anything is saved. */
export type BoardColumns = Record<TaskStatus, string[]>

export function columnsFromTasks(tasks: readonly Task[]): BoardColumns {
  const columns = { todo: [], doing: [], review: [], done: [] } as BoardColumns
  for (const task of sortManual([...tasks])) columns[task.status].push(task.id)
  return columns
}

const statusOf = (columns: BoardColumns, id: string): TaskStatus | undefined => BOARD_STATUSES.find((s) => columns[s].includes(id))

/**
 * The columns as they should look while `activeId` is held over `overId`, which is a task or a column.
 * Returns the same object when nothing would change, so it is cheap to call on every drag-over event.
 *
 * - Over a column: the task goes to the end of it.
 * - Over a task in the same column: it takes that task's place.
 * - Over a task in another column: it is inserted at that task's index.
 */
export function previewMove(columns: BoardColumns, activeId: string, overId: string): BoardColumns {
  const from = statusOf(columns, activeId)
  if (!from || activeId === overId) return columns
  const to = isBoardStatus(overId) ? overId : statusOf(columns, overId)
  if (!to) return columns

  if (from === to) {
    if (isBoardStatus(overId)) {
      const list = columns[from]
      return list[list.length - 1] === activeId ? columns : { ...columns, [from]: moveItem(list, list.indexOf(activeId), list.length - 1) }
    }
    const next = moveItem(columns[from], columns[from].indexOf(activeId), columns[from].indexOf(overId))
    return { ...columns, [from]: next }
  }

  const target = columns[to]
  const at = isBoardStatus(overId) ? target.length : target.indexOf(overId)
  return {
    ...columns,
    [from]: columns[from].filter((id) => id !== activeId),
    [to]: [...target.slice(0, at), activeId, ...target.slice(at)],
  }
}

export interface DropPlace {
  status: TaskStatus
  /** Zero-based position among the visible cards of that column. */
  index: number
  /** How many visible cards the column has. */
  total: number
}

export function placeOf(columns: BoardColumns, id: string): DropPlace | null {
  const status = statusOf(columns, id)
  return status ? { status, index: columns[status].indexOf(id), total: columns[status].length } : null
}

/**
 * Turns a position among the visible cards into a position in the full column, which is what placeTask
 * expects. The two differ when a filter hides some cards: the moved task is put right after the visible
 * card above it, or right before the one below it, and the hidden ones stay where they were.
 */
export function fullIndexFor(all: readonly Task[], activeId: string, visible: BoardColumns, status: TaskStatus): number {
  const ids = visible[status]
  const at = ids.indexOf(activeId)
  if (at < 0) return 0
  const full = columnOf(all, status).filter((t) => t.id !== activeId).map((t) => t.id)
  const above = ids[at - 1]
  const below = ids[at + 1]
  if (above) return full.indexOf(above) + 1
  if (below) return full.indexOf(below)
  return full.length
}

/** One sentence for screen readers: "Task X, kolom Dikerjakan, posisi 2 dari 4". */
export function describePlace(title: string, place: DropPlace | null): string {
  return place ? `Task ${title}, kolom ${STATUS_LABEL[place.status]}, posisi ${place.index + 1} dari ${place.total}.` : `Task ${title}.`
}
