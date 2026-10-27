import { appendOrder } from '@/lib/reorder'
import type { NewEntity, Project, Task } from '@/types/domain'

type TaskDraft = Pick<Task, 'title' | 'status' | 'priority'> & Partial<Omit<NewEntity<Task>, 'title' | 'status' | 'priority'>>

/**
 * A complete task to hand to `add`, from only the fields the caller cares about.
 * It lands at the end of its status column. Pass the current tasks so it can find that end.
 */
export function newTask(draft: TaskDraft, existing: Task[]): NewEntity<Task> {
  return {
    tags: [],
    noteCount: 0,
    timeLog: [],
    focusCount: 0,
    subtasks: [],
    ...draft,
    order: draft.order ?? appendOrder(existing, draft.status),
  }
}

type ProjectDraft = Pick<Project, 'name' | 'status' | 'phase'> & Partial<Omit<NewEntity<Project>, 'name' | 'status' | 'phase'>>

/** A complete project to hand to `add`. New projects start with the quiet slate colour. */
export function newProject(draft: ProjectDraft): NewEntity<Project> {
  return { color: 'slate', milestones: [], links: [], ...draft }
}
