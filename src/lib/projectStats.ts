import { differenceInCalendarDays, parseISO } from 'date-fns'
import { isoDay, weekRange } from '@/lib/date'
import { summarizeTasks, type TaskSummary } from '@/lib/taskStats'
import type { Milestone, Project, Task } from '@/types/domain'

export interface ProjectProgress {
  done: number
  total: number
  percent: number
}

const tasksOf = (project: Project, tasks: Task[]) => tasks.filter((t) => t.projectId === project.id)

/**
 * Progress counts every task and every milestone as one unit of equal weight: done units over all units.
 * Tasks follow summarizeTasks, so finished work that was archived still counts as done. No units, 0%.
 */
export function projectProgress(project: Project, tasks: Task[]): ProjectProgress {
  const t = summarizeTasks(tasksOf(project, tasks))
  const milestones = project.milestones ?? []
  const total = t.total + t.archivedDone + milestones.length
  const done = t.done + t.archivedDone + milestones.filter((m) => m.done).length
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 }
}

export type ProjectHealthLevel = 'sehat' | 'perhatian' | 'berisiko'

export const HEALTH_LABEL: Record<ProjectHealthLevel, string> = {
  sehat: 'Sehat',
  perhatian: 'Perlu perhatian',
  berisiko: 'Berisiko',
}

export interface ProjectHealth {
  level: ProjectHealthLevel
  /** One line saying why, such as "2 task terlambat". Empty when the project is Sehat. */
  reason: string
}

/** Days from today to a yyyy-MM-dd date. Negative once it has passed. */
const daysUntil = (iso: string, today: string) => differenceInCalendarDays(parseISO(iso), parseISO(today))

/**
 * Health, from three signals. The worst one wins and its reason is shown; on a tie the earlier line below wins.
 *
 * 1. Deadline passed while the project is not finished (progress under 100%): Berisiko.
 * 2. Late work, counting open tasks and unchecked milestones whose date is before today:
 *    1 or 2 late items: Perlu perhatian. 3 or more: Berisiko.
 * 3. Deadline proximity against progress (days left counted from today, today itself is 0):
 *    0 to 7 days left and progress under 50%: Berisiko.
 *    8 to 14 days left and progress under 50%: Perlu perhatian.
 *    Exactly 50% progress is already on track, and 15 days or more is never flagged by proximity.
 *
 * Skipped on purpose: a project that is paused or done is Sehat (nothing is expected of it), and a
 * project with no tasks or milestones has no progress to judge, so only signal 1 can apply to it.
 */
export function projectHealth(project: Project, tasks: Task[], today: string = isoDay(0)): ProjectHealth {
  const healthy: ProjectHealth = { level: 'sehat', reason: '' }
  if (project.status !== 'active') return healthy

  const own = tasksOf(project, tasks).filter((t) => !t.archivedAt)
  const { percent, total } = projectProgress(project, tasks)
  const found: ProjectHealth[] = []

  const daysLeft = project.deadline ? daysUntil(project.deadline, today) : null
  if (daysLeft !== null && daysLeft < 0 && percent < 100) found.push({ level: 'berisiko', reason: 'Tenggat project sudah lewat' })

  const lateTasks = own.filter((t) => t.status !== 'done' && !!t.dueDate && t.dueDate < today).length
  const lateMilestones = (project.milestones ?? []).filter((m) => !m.done && !!m.dueDate && m.dueDate < today).length
  const late = lateTasks + lateMilestones
  if (late > 0) {
    const parts = [lateTasks > 0 && `${lateTasks} task`, lateMilestones > 0 && `${lateMilestones} milestone`].filter(Boolean)
    found.push({ level: late >= 3 ? 'berisiko' : 'perhatian', reason: `${parts.join(' dan ')} terlambat` })
  }

  if (daysLeft !== null && daysLeft >= 0 && daysLeft <= 14 && total > 0 && percent < 50) {
    const when = daysLeft === 0 ? 'hari ini' : `${daysLeft} hari lagi`
    found.push({ level: daysLeft <= 7 ? 'berisiko' : 'perhatian', reason: `Tenggat ${when}, progres ${percent}%` })
  }

  const rank: Record<ProjectHealthLevel, number> = { sehat: 0, perhatian: 1, berisiko: 2 }
  return found.reduce((worst, h) => (rank[h.level] > rank[worst.level] ? h : worst), healthy)
}

export interface ProjectTime {
  weekMinutes: number
  totalMinutes: number
}

/**
 * Minutes logged on the project's tasks: this calendar week (Monday to Sunday) and in total.
 * Archived tasks still count, because the time was spent whether or not the task is shown.
 */
export function projectTime(project: Project, tasks: Task[], today: string = isoDay(0)): ProjectTime {
  const { start, end } = weekRange(today)
  let weekMinutes = 0
  let totalMinutes = 0
  for (const task of tasksOf(project, tasks)) {
    for (const entry of task.timeLog) {
      totalMinutes += entry.minutes
      if (entry.date >= start && entry.date <= end) weekMinutes += entry.minutes
    }
  }
  return { weekMinutes, totalMinutes }
}

/**
 * The next unchecked milestone: the earliest dated one, which may be overdue. Undated milestones come
 * only after every dated one, in the order the person arranged them.
 */
export function nextMilestone(project: Project): Milestone | null {
  const open = (project.milestones ?? []).filter((m) => !m.done)
  const dated = open.filter((m) => m.dueDate).sort((a, b) => (a.dueDate as string).localeCompare(b.dueDate as string))
  return dated[0] ?? open[0] ?? null
}

export interface ProjectSummary {
  progress: ProjectProgress
  health: ProjectHealth
  time: ProjectTime
  nextMilestone: Milestone | null
  tasks: TaskSummary
}

/** Everything a surface needs about one project, from one call. Cards, detail page and dashboard all use it. */
export function projectSummary(project: Project, tasks: Task[], today: string = isoDay(0)): ProjectSummary {
  return {
    progress: projectProgress(project, tasks),
    health: projectHealth(project, tasks, today),
    time: projectTime(project, tasks, today),
    nextMilestone: nextMilestone(project),
    tasks: summarizeTasks(tasksOf(project, tasks), today),
  }
}
