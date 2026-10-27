import { Link } from 'react-router-dom'
import { ArrowCounterClockwise, Archive } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { fmt } from '@/lib/date'
import { toastWithRetry } from '@/stores/retryToast'
import type { Project } from '@/types/domain'
import { unarchiveProject } from './projectActions'
import { ProjectDot } from './projectUi'

/** Archived projects, newest first, each with a way back. Nothing here counts towards the active numbers. */
export function ArchivedProjects({ projects, hasAny }: { projects: Project[]; hasAny: boolean }) {

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={Archive}
        title={hasAny ? 'Tidak ada project arsip yang cocok' : 'Arsip masih kosong'}
        description={hasAny ? 'Ubah kata kunci atau status untuk melihat project lain.' : 'Project yang diarsipkan muncul di sini dan bisa dipulihkan kapan saja.'}
      />
    )
  }
  const sorted = [...projects].sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''))

  return (
    <ul className="divide-y rounded-card border bg-surface">
      {sorted.map((project) => (
        <li key={project.id} className="flex items-center gap-3 px-4 py-3">
          <Link to={`/projects/${project.id}`} className="min-w-0 flex-1 rounded-chip">
            <span className="flex items-center gap-2 font-medium">
              <ProjectDot color={project.color} />
              <span className="truncate hover:underline">{project.name}</span>
            </span>
            <span className="mt-0.5 block text-xs tabular-nums text-muted">{project.archivedAt ? `Diarsipkan ${fmt(project.archivedAt, 'd MMM yyyy')}` : ''}</span>
          </Link>
          <Button onClick={() => unarchiveProject(project).catch(() => toastWithRetry('Project gagal dipulihkan.', () => unarchiveProject(project)))}>
            <ArrowCounterClockwise aria-hidden />
            Pulihkan
          </Button>
        </li>
      ))}
    </ul>
  )
}
