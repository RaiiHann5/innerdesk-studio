import type { ProjectSummary } from '@/lib/projectStats'
import { phaseIndex } from '@/lib/projectPhase'
import type { Project, ProjectStatus } from '@/types/domain'

export interface ProjectRow {
  project: Project
  summary: ProjectSummary
}

export type ProjectSortKey = 'name' | 'progress' | 'health' | 'deadline' | 'phase'
export type SortDirection = 'asc' | 'desc'

export interface ProjectFilters {
  query: string
  status: 'all' | ProjectStatus
}

export const isArchivedProject = (p: Project): boolean => !!p.archivedAt

/** Search by name and description, and by status. Archived projects are the caller's choice: pass the right list. */
export function filterProjects(projects: readonly Project[], { query, status }: ProjectFilters): Project[] {
  const needle = query.trim().toLowerCase()
  return projects
    .filter((p) => status === 'all' || p.status === status)
    .filter((p) => !needle || `${p.name} ${p.description ?? ''}`.toLowerCase().includes(needle))
}

const HEALTH_RANK = { sehat: 0, perhatian: 1, berisiko: 2 } as const

/**
 * Sorts rows for the list view. Ascending means: name A to Z, least progress first, healthiest first, earliest
 * deadline first, earliest phase first. A project without a deadline always goes last, whichever way it is sorted.
 * Ties fall back to name, then id, so the order is stable.
 */
export function sortProjectRows(rows: readonly ProjectRow[], key: ProjectSortKey, direction: SortDirection): ProjectRow[] {
  const sign = direction === 'asc' ? 1 : -1
  const compare = (a: ProjectRow, b: ProjectRow): number => {
    switch (key) {
      case 'name':
        return a.project.name.localeCompare(b.project.name, 'id') * sign
      case 'progress':
        return (a.summary.progress.percent - b.summary.progress.percent) * sign
      case 'health':
        return (HEALTH_RANK[a.summary.health.level] - HEALTH_RANK[b.summary.health.level]) * sign
      case 'phase':
        return (phaseIndex(a.project.phase) - phaseIndex(b.project.phase)) * sign
      case 'deadline': {
        const x = a.project.deadline
        const y = b.project.deadline
        if (!x && !y) return 0
        if (!x) return 1
        if (!y) return -1
        return x.localeCompare(y) * sign
      }
    }
  }
  return [...rows].sort((a, b) => compare(a, b) || a.project.name.localeCompare(b.project.name, 'id') || a.project.id.localeCompare(b.project.id))
}
