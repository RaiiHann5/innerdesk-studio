import { Flag } from '@phosphor-icons/react'
import { toggleMilestoneDone } from '@/features/projects/projectActions'
import { cn } from '@/lib/cn'
import { toastWithRetry } from '@/stores/retryToast'
import { CATEGORY_STYLE } from './categories'
import type { MilestoneItem } from './lib/calendarItems'

/**
 * A project milestone due that day, in the all-day row or month cell. It is ticked off in place, like a task,
 * but wears a flag and its project's colour so it reads as a project date and not as a task.
 */
export function MilestoneChip({ item }: { item: MilestoneItem }) {
  const { milestone, project } = item

  const toggle = () => {
    const run = () => toggleMilestoneDone(project.id, milestone.id)
    run().catch(() => toastWithRetry('Milestone belum bisa diperbarui.', run))
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={milestone.done}
      onClick={toggle}
      aria-label={`Milestone ${project.name}: ${milestone.title}`}
      title={`Milestone · ${project.name}`}
      className="flex h-5 w-full min-w-0 items-center gap-1.5 rounded-chip px-1 text-left text-xs transition-colors duration-fast hover:bg-sunken"
    >
      <span aria-hidden className={cn('h-3.5 w-[3px] shrink-0 rounded-full', CATEGORY_STYLE[project.color].bar)} />
      <Flag size={14} weight={milestone.done ? 'fill' : 'regular'} aria-hidden className="shrink-0 text-muted" />
      <span className={cn('truncate', milestone.done ? 'text-muted line-through' : 'font-medium')}>{milestone.title}</span>
    </button>
  )
}
