import { FolderSimple, X } from '@phosphor-icons/react'
import { controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { useProjectStore } from '@/stores/entities'

interface ProjectLinkProps {
  projectId: string | undefined
  onChange: (projectId: string | undefined) => void
}

/** The project a note belongs to: a clearable chip once linked, a select until then. */
export function ProjectLink({ projectId, onChange }: ProjectLinkProps) {
  const projects = useProjectStore((s) => s.items)

  if (projectId) {
    // The project may have been deleted since the note was linked to it.
    const project = projects.find((p) => p.id === projectId)
    return (
      <span className="flex h-7 items-center gap-1.5 rounded-control bg-sunken pl-2 text-sm text-ink">
        <FolderSimple size={14} aria-hidden className="shrink-0 text-muted" />
        <span className={cn('max-w-40 truncate', !project && 'text-muted')}>{project ? project.name : 'Project dihapus'}</span>
        <button
          type="button"
          aria-label={project ? `Lepas dari project ${project.name}` : 'Lepas dari project yang dihapus'}
          onClick={() => onChange(undefined)}
          className="flex size-6 items-center justify-center rounded-control text-muted outline-none hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <X size={12} weight="bold" aria-hidden />
        </button>
      </span>
    )
  }

  if (projects.length === 0) return null
  return (
    <select
      value=""
      onChange={(e) => onChange(e.target.value || undefined)}
      aria-label="Hubungkan ke project"
      className={cn(controlClass, 'h-7 w-auto max-w-48 text-sm text-muted')}
    >
      <option value="">Hubungkan project</option>
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
        </option>
      ))}
    </select>
  )
}
