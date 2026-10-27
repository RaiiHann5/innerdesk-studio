import { ORDER_STEP } from '@/lib/reorder'
import type { NewEntity, Project, Subtask, Task } from '@/types/domain'

export interface DuplicatePlan {
  project: NewEntity<Project>
  tasks: Array<Omit<NewEntity<Task>, 'projectId'>>
}

const RANK: Record<Task['status'], number> = { doing: 0, review: 1, todo: 2, done: 3 }

/**
 * What a copy of a project contains, without touching the store. It is meant as a starting point for a new
 * round of similar work, so it carries the plan and none of the history:
 *
 * - Tasks: title, description, priority, tags, estimate and subtasks (all unchecked, new ids). They start as
 *   "todo" with no dates, no recurrence, no tracked time and no notes count. Archived tasks are left out.
 *   The original order is kept, with unfinished work first.
 * - Milestones: titles only, unchecked, without dates. Old dates would show the copy as late on day one.
 * - Project: name with "(salinan)", color, goal, description and links. Status active, phase riset, no dates.
 */
export function planDuplicate(project: Project, tasks: readonly Task[], newId: () => string = () => `s-${Math.random().toString(36).slice(2, 10)}`): DuplicatePlan {
  const own = tasks
    .filter((t) => t.projectId === project.id && !t.archivedAt)
    .sort((a, b) => RANK[a.status] - RANK[b.status] || a.order - b.order || a.id.localeCompare(b.id))

  return {
    project: {
      name: `${project.name} (salinan)`,
      description: project.description,
      status: 'active',
      phase: 'riset',
      color: project.color,
      goal: project.goal,
      milestones: project.milestones.map((m, i) => ({ id: `m-${newId()}-${i}`, title: m.title, done: false })),
      links: project.links.map((l, i) => ({ ...l, id: `l-${newId()}-${i}` })),
    },
    tasks: own.map((t, i) => ({
      title: t.title,
      description: t.description,
      status: 'todo',
      priority: t.priority,
      tags: [...t.tags],
      noteCount: 0,
      timeLog: [],
      focusCount: 0,
      estimateMinutes: t.estimateMinutes,
      subtasks: t.subtasks.map((s: Subtask) => ({ id: newId(), title: s.title, done: false })),
      order: (i + 1) * ORDER_STEP,
    })),
  }
}
