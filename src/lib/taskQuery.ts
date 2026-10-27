import { addDays } from 'date-fns'
import { isoDay, toISODate, weekRange } from '@/lib/date'
import { STATUS_LABEL, PRIORITY_LABEL } from '@/lib/labels'
import type { Priority, Project, Task, TaskStatus } from '@/types/domain'

export type SortKey = 'priority' | 'due' | 'updated' | 'title'
export type DueFilter = 'all' | 'overdue' | 'week' | 'none'

/** hide: the default everywhere. only: the archive list. include: both, for lookups that must see everything. */
export type ArchiveScope = 'hide' | 'only' | 'include'

export interface TaskFilters {
  query: string
  priorities: Priority[]
  due: DueFilter
  /** 'all' or a project id. */
  projectId: string
  /** One smart view at a time, or none. Combines with every other filter. */
  smart: SmartView | null
  archive: ArchiveScope
}

export const EMPTY_FILTERS: TaskFilters = { query: '', priorities: [], due: 'all', projectId: 'all', smart: null, archive: 'hide' }

export const isArchived = (t: Pick<Task, 'archivedAt'>) => !!t.archivedAt

/** Tasks that are not archived. The one call surfaces use when they read the store directly. */
export const activeTasks = (tasks: Task[]): Task[] => tasks.filter((t) => !isArchived(t))

/** Manual order inside a column: order, then creation time, then id, so equal orders never shuffle. */
export const compareManual = (a: Task, b: Task) =>
  a.order - b.order || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)

export const sortManual = (tasks: Task[]): Task[] => [...tasks].sort(compareManual)

export type SmartView = 'today' | 'week' | 'overdue' | 'noDue' | 'highPriority' | 'noProject'

export const SMART_VIEWS: SmartView[] = ['today', 'week', 'overdue', 'noDue', 'highPriority', 'noProject']

export const SMART_VIEW_LABEL: Record<SmartView, string> = {
  today: 'Hari ini',
  week: 'Minggu ini',
  overdue: 'Terlambat',
  noDue: 'Tanpa tenggat',
  highPriority: 'Prioritas tinggi',
  noProject: 'Tanpa project',
}

/**
 * Smart views are about work still to do, so a finished task never matches one.
 * - today: due today.
 * - week: due anywhere in the current calendar week (Monday to Sunday), including days already past.
 * - overdue: due before today.
 * - noDue: no due date.
 * - highPriority: urgent or high.
 * - noProject: not attached to a project.
 */
export function matchesSmartView(view: SmartView, task: Task, today: string = isoDay(0)): boolean {
  if (task.status === 'done') return false
  switch (view) {
    case 'today':
      return task.dueDate === today
    case 'week': {
      const { start, end } = weekRange(today)
      return !!task.dueDate && task.dueDate >= start && task.dueDate <= end
    }
    case 'overdue':
      return !!task.dueDate && task.dueDate < today
    case 'noDue':
      return !task.dueDate
    case 'highPriority':
      return task.priority === 'urgent' || task.priority === 'high'
    case 'noProject':
      return !task.projectId
  }
}

/** How many tasks each chip would show. Archived tasks are not counted. */
export function smartViewCounts(tasks: Task[], today: string = isoDay(0)): Record<SmartView, number> {
  const counts = Object.fromEntries(SMART_VIEWS.map((v) => [v, 0])) as Record<SmartView, number>
  for (const task of tasks) {
    if (isArchived(task)) continue
    for (const view of SMART_VIEWS) if (matchesSmartView(view, task, today)) counts[view] += 1
  }
  return counts
}

export const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

export const SORT_LABEL: Record<SortKey, string> = {
  priority: 'Prioritas',
  due: 'Tenggat',
  updated: 'Terakhir diubah',
  title: 'Judul',
}

export const DUE_LABEL: Record<DueFilter, string> = {
  all: 'Semua',
  overdue: 'Terlambat',
  week: '7 hari ke depan',
  none: 'Tanpa tenggat',
}

/** Filters in the popover only; the search text is shown in its own field. */
export const countActiveFilters = (f: TaskFilters) =>
  f.priorities.length + Number(f.due !== 'all') + Number(f.projectId !== 'all')

export function filterTasks(tasks: Task[], f: TaskFilters, today: string = isoDay(0)): Task[] {
  const weekEnd = toISODate(addDays(new Date(today + 'T00:00:00'), 7))
  const needle = f.query.trim().toLowerCase()

  return tasks.filter((t) => {
    if (f.archive === 'hide' && isArchived(t)) return false
    if (f.archive === 'only' && !isArchived(t)) return false
    if (f.smart && !matchesSmartView(f.smart, t, today)) return false
    if (needle) {
      const haystack = [t.id, t.title, t.description ?? '', ...t.tags].join(' ').toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    if (f.priorities.length > 0 && !f.priorities.includes(t.priority)) return false
    if (f.projectId !== 'all' && t.projectId !== f.projectId) return false
    if (f.due === 'none') return !t.dueDate
    if (f.due === 'overdue') return !!t.dueDate && t.dueDate < today && t.status !== 'done'
    if (f.due === 'week') return !!t.dueDate && t.dueDate >= today && t.dueDate <= weekEnd
    return true
  })
}

export function sortTasks(tasks: Task[], key: SortKey): Task[] {
  const byDue = (a: Task, b: Task) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')
  const compare: Record<SortKey, (a: Task, b: Task) => number> = {
    priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byDue(a, b),
    due: (a, b) => byDue(a, b) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
    updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    title: (a, b) => a.title.localeCompare(b.title, 'id'),
  }
  return [...tasks].sort(compare[key])
}

export type GroupKey = 'status' | 'priority' | 'project' | 'due'

export const GROUP_LABEL: Record<GroupKey, string> = {
  status: 'Status',
  priority: 'Prioritas',
  project: 'Project',
  due: 'Tenggat',
}

export interface TaskGroup {
  /** Stable key for collapse state: a status, a priority, a project id or a due bucket. */
  key: string
  label: string
  tasks: Task[]
}

const STATUS_ORDER: TaskStatus[] = ['todo', 'doing', 'review', 'done']
const NO_PROJECT = 'none'

/** Ordered due buckets. A finished task is never late: if its date has passed it goes to 'earlier'. */
const DUE_BUCKETS = [
  { key: 'overdue', label: 'Terlambat' },
  { key: 'today', label: 'Hari ini' },
  { key: 'week', label: 'Minggu ini' },
  { key: 'later', label: 'Nanti' },
  { key: 'earlier', label: 'Sebelumnya' },
  { key: 'none', label: 'Tanpa tenggat' },
] as const

function dueBucket(task: Task, today: string): (typeof DUE_BUCKETS)[number]['key'] {
  if (!task.dueDate) return 'none'
  if (task.dueDate < today) return task.status === 'done' ? 'earlier' : 'overdue'
  if (task.dueDate === today) return 'today'
  return task.dueDate <= weekRange(today).end ? 'week' : 'later'
}

/**
 * Splits tasks into labelled groups, in a fixed order per key. Empty groups are left out and tasks keep the
 * order they came in, so sort first. Projects are listed by name with "Tanpa project" last.
 */
export function groupTasks(tasks: Task[], by: GroupKey, projects: Project[] = [], today: string = isoDay(0)): TaskGroup[] {
  const buckets = new Map<string, Task[]>()
  const add = (key: string, task: Task) => buckets.set(key, [...(buckets.get(key) ?? []), task])
  const keyOf = (t: Task) =>
    by === 'status' ? t.status : by === 'priority' ? t.priority : by === 'project' ? (t.projectId ?? NO_PROJECT) : dueBucket(t, today)
  for (const task of tasks) add(keyOf(task), task)

  let order: { key: string; label: string }[]
  if (by === 'status') order = STATUS_ORDER.map((k) => ({ key: k, label: STATUS_LABEL[k] }))
  else if (by === 'priority')
    order = (Object.keys(PRIORITY_RANK) as Priority[]).sort((a, b) => PRIORITY_RANK[a] - PRIORITY_RANK[b]).map((k) => ({ key: k, label: PRIORITY_LABEL[k] }))
  else if (by === 'due') order = [...DUE_BUCKETS]
  else {
    const named = projects.filter((p) => buckets.has(p.id)).sort((a, b) => a.name.localeCompare(b.name, 'id'))
    order = [...named.map((p) => ({ key: p.id, label: p.name })), { key: NO_PROJECT, label: 'Tanpa project' }]
    // Tasks pointing at a project that no longer exists are shown with the unassigned ones.
    const known = new Set(named.map((p) => p.id))
    for (const [key, list] of buckets) {
      if (key !== NO_PROJECT && !known.has(key)) {
        buckets.set(NO_PROJECT, [...(buckets.get(NO_PROJECT) ?? []), ...list])
        buckets.delete(key)
      }
    }
  }

  return order.filter(({ key }) => buckets.has(key)).map(({ key, label }) => ({ key, label, tasks: buckets.get(key) as Task[] }))
}
