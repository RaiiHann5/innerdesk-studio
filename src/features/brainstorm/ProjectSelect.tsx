import { controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import type { Project } from '@/types/domain'

interface ProjectSelectProps {
  id: string
  value: string | undefined
  projects: Project[]
  onChange: (projectId: string | undefined) => void
  className?: string
}

/** Picks the project a session belongs to. Archived projects are left out, unless the session is still linked to one. */
export function ProjectSelect({ id, value, projects, onChange, className }: ProjectSelectProps) {
  const options = projects.filter((p) => !p.archivedAt || p.id === value)
  return (
    <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)} className={cn(controlClass, 'cursor-pointer', className)}>
      <option value="">Tanpa project</option>
      {options.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  )
}
