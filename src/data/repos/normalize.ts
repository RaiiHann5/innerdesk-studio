import { CATEGORY_STYLE } from '@/features/calendar/categories'
import { ORDER_STEP } from '@/lib/reorder'
import type { CategoryColor, Milestone, Project, ProjectLinkItem, ProjectLinkKind, Subtask, Task, TaskRecurrence, TimeLogEntry } from '@/types/domain'

/**
 * Defaults filled in when stored data is read, so data written before a field existed keeps working.
 * Nothing here is a migration: stored data is never rewritten on its own. The next normal save writes the
 * filled-in shape, and a field the person set is never overwritten. Running it twice changes nothing.
 */

const COLORS = Object.keys(CATEGORY_STYLE) as CategoryColor[]
const LINK_KINDS: ProjectLinkKind[] = ['akun', 'dokumen', 'desain', 'lainnya']
const FREQS: TaskRecurrence['freq'][] = ['daily', 'weekly', 'monthly']
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v : undefined)
const day = (v: unknown): string | undefined => (typeof v === 'string' && ISO_DAY.test(v) ? v : undefined)
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const record = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {})

/** The same project always gets the same colour, so a project stored without one does not change tone between visits. */
export function defaultProjectColor(id: string): CategoryColor {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return COLORS[hash % COLORS.length]
}

function subtasksOf(raw: unknown, ownerId: string): Subtask[] {
  const out: Subtask[] = []
  list(raw).forEach((entry, i) => {
    const s = record(entry)
    const title = text(s.title)
    if (title) out.push({ id: text(s.id) ?? `${ownerId}-s${i + 1}`, title, done: s.done === true })
  })
  return out
}

function recurrenceOf(raw: unknown): TaskRecurrence | undefined {
  const r = record(raw)
  const freq = FREQS.find((f) => f === r.freq)
  if (!freq) return undefined
  return { freq, interval: finite(r.interval) ? Math.max(1, Math.floor(r.interval)) : 1 }
}

function timeLogOf(raw: unknown): TimeLogEntry[] {
  return list(raw).flatMap((entry) => {
    const e = record(entry)
    return typeof e.date === 'string' && finite(e.minutes) ? [{ date: e.date, minutes: e.minutes }] : []
  })
}

/** Fills every task field the current shape expects. `order` is filled per column in `normalizeTasks`. */
function normalizeTask(raw: Task): Task {
  const r = raw as unknown as Record<string, unknown>
  const estimate = finite(r.estimateMinutes) && r.estimateMinutes > 0 ? Math.round(r.estimateMinutes) : undefined
  const task: Task = {
    ...raw,
    tags: list(r.tags).filter((t): t is string => typeof t === 'string'),
    noteCount: finite(r.noteCount) ? r.noteCount : 0,
    timeLog: timeLogOf(r.timeLog),
    focusCount: finite(r.focusCount) ? r.focusCount : 0,
    subtasks: subtasksOf(r.subtasks, raw.id),
    order: finite(r.order) ? r.order : Number.NaN,
  }
  if (estimate !== undefined) task.estimateMinutes = estimate
  else delete task.estimateMinutes
  const recurrence = recurrenceOf(r.recurrence)
  if (recurrence) task.recurrence = recurrence
  else delete task.recurrence
  const archivedAt = text(r.archivedAt)
  if (archivedAt) task.archivedAt = archivedAt
  else delete task.archivedAt
  return task
}

/**
 * Tasks from storage, with defaults. A task with no `order` is placed after the ones that have one in its
 * status column, oldest first (createdAt, then id), so the board looks the same as it did before ordering existed.
 */
export function normalizeTasks(raw: Task[]): Task[] {
  const tasks = raw.map(normalizeTask)
  const top = new Map<string, number>()
  for (const t of tasks) if (Number.isFinite(t.order)) top.set(t.status, Math.max(top.get(t.status) ?? 0, t.order))

  const missing = tasks.filter((t) => !Number.isFinite(t.order)).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
  const placed = new Map<string, number>()
  for (const t of missing) {
    const n = (placed.get(t.status) ?? 0) + 1
    placed.set(t.status, n)
    t.order = (top.get(t.status) ?? 0) + n * ORDER_STEP
  }
  return tasks
}

function milestonesOf(raw: unknown, ownerId: string): Milestone[] {
  const out: Milestone[] = []
  list(raw).forEach((entry, i) => {
    const m = record(entry)
    const title = text(m.title)
    if (!title) return
    const milestone: Milestone = { id: text(m.id) ?? `${ownerId}-m${i + 1}`, title, done: m.done === true }
    const dueDate = day(m.dueDate)
    if (dueDate) milestone.dueDate = dueDate
    out.push(milestone)
  })
  return out
}

function linksOf(raw: unknown, ownerId: string): ProjectLinkItem[] {
  const out: ProjectLinkItem[] = []
  list(raw).forEach((entry, i) => {
    const l = record(entry)
    const url = text(l.url)
    if (!url) return
    out.push({
      id: text(l.id) ?? `${ownerId}-l${i + 1}`,
      title: text(l.title) ?? url,
      url,
      kind: LINK_KINDS.find((k) => k === l.kind) ?? 'lainnya',
    })
  })
  return out
}

export function normalizeProject(raw: Project): Project {
  const r = raw as unknown as Record<string, unknown>
  const project: Project = {
    ...raw,
    color: COLORS.find((c) => c === r.color) ?? defaultProjectColor(raw.id),
    milestones: milestonesOf(r.milestones, raw.id),
    links: linksOf(r.links, raw.id),
  }
  const startDate = day(r.startDate)
  if (startDate) project.startDate = startDate
  else delete project.startDate
  const goal = text(r.goal)
  if (goal) project.goal = goal
  else delete project.goal
  const archivedAt = text(r.archivedAt)
  if (archivedAt) project.archivedAt = archivedAt
  else delete project.archivedAt
  return project
}

export const normalizeProjects = (raw: Project[]): Project[] => raw.map(normalizeProject)
