import { Flag } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { dueLabelInline } from '@/lib/date'
import { formatDuration } from '@/lib/taskTime'
import { projectSummary } from '@/lib/projectStats'
import { HEALTH_LABEL } from '@/lib/projectStats'
import type { Project, Task } from '@/types/domain'
import { StatsRow } from '@/features/tasks/StatsRow'
import { MilestoneTimeline } from './MilestoneTimeline'
import { PhaseStepper } from './PhaseStepper'
import { HealthLine, milestoneOverdue } from './projectUi'

/** The Ringkasan tab. Every number here comes from projectSummary, the same call the project card makes. */
export function ProjectOverview({ project, tasks }: { project: Project; tasks: Task[] }) {
  const { progress, health, time, nextMilestone } = projectSummary(project, tasks)

  return (
    <div className="space-y-6">
      <StatsRow
        label="Ringkasan project"
        items={[
          { label: 'Progres', value: `${progress.percent}%` },
          { label: 'Kesehatan', value: HEALTH_LABEL[health.level], danger: health.level === 'berisiko' },
          { label: 'Waktu minggu ini', value: formatDuration(time.weekMinutes) },
          { label: 'Total waktu', value: formatDuration(time.totalMinutes) },
        ]}
      />

      <div className="space-y-2">
        <HealthLine health={health} className="text-sm" />
        <p className="text-sm tabular-nums text-muted">
          {progress.done} dari {progress.total} {project.milestones.length > 0 ? 'task dan milestone' : 'task'} selesai.
        </p>
        {nextMilestone && (
          <p className={cn('flex items-center gap-1.5 text-sm tabular-nums', milestoneOverdue(nextMilestone) ? 'font-medium text-status-overdue' : 'text-muted')}>
            <Flag aria-hidden size={14} className="shrink-0" />
            <span>
              Milestone berikutnya: {nextMilestone.title}
              {nextMilestone.dueDate ? `, ${dueLabelInline(nextMilestone.dueDate)}` : ''}
            </span>
          </p>
        )}
      </div>

      {project.goal && (
        <section aria-labelledby="goal-heading" className="space-y-1">
          <h3 id="goal-heading" className="text-md font-bold">
            Tujuan
          </h3>
          <p className="max-w-prose text-base">{project.goal}</p>
        </section>
      )}

      <PhaseStepper project={project} />
      <MilestoneTimeline project={project} nextId={nextMilestone?.id} />
    </div>
  )
}
