import { Link } from 'react-router-dom'
import { CalendarBlank, Flag } from '@phosphor-icons/react'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/cn'
import { dueLabelInline, isOverdue } from '@/lib/date'
import { PHASE_LABEL } from '@/lib/projectPhase'
import { projectSummary } from '@/lib/projectStats'
import type { Project, ProjectStatus, Task } from '@/types/domain'
import { HealthLine, ProjectDot, deadlineText, milestoneOverdue, monogram } from './projectUi'

const STATUS: Record<ProjectStatus, { label: string; dot: string }> = {
  active: { label: 'Aktif', dot: 'bg-status-doing' },
  paused: { label: 'Dijeda', dot: 'bg-status-review' },
  done: { label: 'Selesai', dot: 'bg-status-done' },
}

export function ProjectCard({ project, tasks }: { project: Project; tasks: Task[] }) {
  const { progress, health, nextMilestone } = projectSummary(project, tasks)
  const status = STATUS[project.status]
  const deadlineLate = !!project.deadline && project.status !== 'done' && isOverdue(project.deadline)
  const hasMilestones = project.milestones.length > 0

  return (
    <Link
      to={`/projects/${project.id}`}
      className="block rounded-card border bg-surface p-4 transition-colors duration-fast hover:bg-sunken/60"
    >
      <article>
        <header className="flex items-start gap-3">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-control border bg-sunken font-display text-sm font-bold">
            {monogram(project.name)}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-2 font-ui text-base font-medium">
              <ProjectDot color={project.color} />
              <span className="truncate">{project.name}</span>
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
              <span aria-hidden className={cn('size-1.5 rounded-full', status.dot)} />
              {status.label}, fase {PHASE_LABEL[project.phase].toLowerCase()}
            </p>
          </div>
        </header>

        <div className="mt-4 flex items-baseline justify-between text-xs">
          <span className="tabular-nums text-muted">
            {progress.done} dari {progress.total} {hasMilestones ? 'task dan milestone' : 'task'}
          </span>
          <span className="font-medium tabular-nums">{progress.percent}%</span>
        </div>
        <ProgressBar value={progress.percent} label={`Progres ${project.name}`} className="mt-1.5" />

        <HealthLine health={health} className="mt-3" />

        {nextMilestone ? (
          <p className={cn('mt-3 flex min-w-0 items-center gap-1.5 text-xs tabular-nums text-muted', milestoneOverdue(nextMilestone) && 'font-medium text-status-overdue')}>
            <Flag size={14} aria-hidden className="shrink-0" />
            <span className="sr-only">Milestone berikutnya: </span>
            <span className="truncate">
              {nextMilestone.title}
              {nextMilestone.dueDate ? `, ${dueLabelInline(nextMilestone.dueDate)}` : ''}
            </span>
          </p>
        ) : (
          <p className={cn('mt-3 flex items-center gap-1.5 text-xs tabular-nums text-muted', deadlineLate && 'font-medium text-status-overdue')}>
            <CalendarBlank size={14} aria-hidden />
            {deadlineText(project)}
          </p>
        )}
      </article>
    </Link>
  )
}
