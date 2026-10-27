import { CATEGORY_STYLE } from '@/features/calendar/categories'
import { cn } from '@/lib/cn'
import { dueLabelInline, isOverdue } from '@/lib/date'
import type { ProjectHealth } from '@/lib/projectStats'
import { HEALTH_LABEL } from '@/lib/projectStats'
import type { CategoryColor, Milestone, Project } from '@/types/domain'

export const monogram = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

/** The project's colour as a small dot. Decorative: the name always carries the meaning. */
export function ProjectDot({ color, className }: { color: CategoryColor; className?: string }) {
  return <span aria-hidden className={cn('size-2 shrink-0 rounded-full', CATEGORY_STYLE[color].bar, className)} />
}

/**
 * Health, said once. Nothing at all while the project is Sehat, so a healthy project stays quiet; otherwise the
 * level and the reason in one line. Colour never carries it alone: the words do.
 */
export function HealthLine({ health, className }: { health: ProjectHealth; className?: string }) {
  if (health.level === 'sehat') return null
  const risky = health.level === 'berisiko'
  return (
    <p className={cn('flex min-w-0 items-center gap-1.5 text-xs', risky ? 'font-medium text-status-overdue' : 'text-ink', className)}>
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', risky ? 'bg-status-overdue' : 'bg-status-review')} />
      <span className="truncate">
        {HEALTH_LABEL[health.level]}
        {health.reason ? `: ${health.reason}` : ''}
      </span>
    </p>
  )
}

/** The date text of a milestone, red only when it is open and past. */
export const milestoneOverdue = (m: Milestone): boolean => !m.done && !!m.dueDate && isOverdue(m.dueDate)

export const deadlineText = (project: Project): string => (project.deadline ? `Tenggat ${dueLabelInline(project.deadline)}` : 'Tanpa tenggat')
