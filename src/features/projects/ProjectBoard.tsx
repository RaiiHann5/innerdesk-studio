import { FolderSimple, MagnifyingGlass } from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui/EmptyState'
import { PHASES, PHASE_LABEL } from '@/lib/projectPhase'
import type { Project, Task } from '@/types/domain'
import { ProjectCard } from './ProjectCard'

interface ProjectBoardProps {
  /** Already filtered. */
  projects: Project[]
  tasks: Task[]
  /** True when the unfiltered list has projects, so an empty result means "no match". */
  hasAny: boolean
}

export function ProjectBoard({ projects, tasks, hasAny }: ProjectBoardProps) {
  if (projects.length === 0) {
    return hasAny ? (
      <EmptyState icon={MagnifyingGlass} title="Tidak ada project yang cocok" description="Ubah kata kunci atau status untuk melihat project lain." />
    ) : (
      <EmptyState icon={FolderSimple} title="Belum ada project" description="Project mengelompokkan task dan menunjukkan kemajuannya." />
    )
  }

  return (
    <div className="relative flex items-stretch gap-4 overflow-x-auto pb-2">
      {PHASES.map((phase) => {
        const list = projects.filter((p) => p.phase === phase)
        return (
          <section key={phase} aria-label={`Fase ${PHASE_LABEL[phase].toLowerCase()}`} className="w-72 shrink-0 space-y-3 lg:w-auto lg:min-w-60 lg:flex-1">
            <span className="inline-flex h-7 items-center gap-2 rounded-control border bg-surface px-2.5 text-sm font-medium">
              {PHASE_LABEL[phase]}
              <span className="tabular-nums text-muted">{list.length}</span>
            </span>
            {list.length === 0 && <p className="rounded-card border border-dashed p-4 text-center text-sm text-muted">Belum ada project</p>}
            {list.map((project) => (
              <ProjectCard key={project.id} project={project} tasks={tasks} />
            ))}
          </section>
        )
      })}
    </div>
  )
}
