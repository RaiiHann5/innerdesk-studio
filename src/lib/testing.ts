import type { Project, Task } from '@/types/domain'

/** Task factory for unit tests. Every field a task needs is filled, so a test names only what it cares about. */
export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'TSK-1',
    title: 'Contoh task',
    status: 'todo',
    priority: 'medium',
    tags: [],
    noteCount: 0,
    timeLog: [],
    focusCount: 0,
    subtasks: [],
    order: 1000,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'prj-1',
    name: 'Contoh project',
    status: 'active',
    phase: 'riset',
    color: 'slate',
    milestones: [],
    links: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}
