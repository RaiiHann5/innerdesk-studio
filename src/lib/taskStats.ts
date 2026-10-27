import { isoDay } from '@/lib/date'
import type { Project, Task } from '@/types/domain'

export interface StatItem {
  label: string
  value: string
  /** Renders the value in the overdue colour when true. */
  danger?: boolean
}

export interface TaskSummary {
  /** Visible tasks: everything not archived. */
  total: number
  /** Visible tasks that are done. */
  done: number
  open: number
  overdue: number
  /** Finished work that was archived. It no longer shows, but it still counts as done in `percent`. */
  archivedDone: number
  percent: number
}

/**
 * The one place task numbers are computed. The stats row, project cards, the dashboard and the project
 * detail page all read this, so they cannot disagree.
 *
 * Archived tasks are hidden from total, open and overdue. Archived tasks that were finished still count
 * towards `percent`, otherwise archiving the Done column would make progress go backwards. Archived tasks
 * that were not finished (dropped work) count nowhere.
 */
export function summarizeTasks(tasks: Task[], today: string = isoDay(0)): TaskSummary {
  const visible = tasks.filter((t) => !t.archivedAt)
  const archivedDone = tasks.filter((t) => t.archivedAt && t.status === 'done').length
  const done = visible.filter((t) => t.status === 'done').length
  const overdue = visible.filter((t) => t.status !== 'done' && !!t.dueDate && t.dueDate < today).length
  const counted = visible.length + archivedDone
  return {
    total: visible.length,
    done,
    open: visible.length - done,
    overdue,
    archivedDone,
    percent: counted ? Math.round(((done + archivedDone) / counted) * 100) : 0,
  }
}

export function globalStatItems(tasks: Task[], projects: Project[]): StatItem[] {
  const s = summarizeTasks(tasks)
  return [
    { label: 'Project aktif', value: String(projects.filter((p) => p.status === 'active' && !p.archivedAt).length) },
    { label: 'Task terbuka', value: String(s.open) },
    { label: 'Selesai', value: `${s.percent}%` },
    { label: 'Terlambat', value: String(s.overdue), danger: s.overdue > 0 },
  ]
}

/**
 * The numbers above a project's tasks. Pass the project's own progress (tasks and milestones together,
 * from projectProgress) as `percent`, so this row says the same thing as the project card and detail page.
 */
export function projectStatItems(tasks: Task[], percent?: number): StatItem[] {
  const s = summarizeTasks(tasks)
  return [
    { label: 'Total task', value: String(s.total) },
    { label: 'Task terbuka', value: String(s.open) },
    { label: 'Selesai', value: `${percent ?? s.percent}%` },
    { label: 'Terlambat', value: String(s.overdue), danger: s.overdue > 0 },
  ]
}
