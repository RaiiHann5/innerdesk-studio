import { memo } from 'react'
import { cn } from '@/lib/cn'
import { STATUS_LABEL } from '@/lib/labels'
import { useProjectStore } from '@/stores/entities'
import { toastWithRetry } from '@/stores/retryToast'
import { changeStatus } from '@/features/tasks/taskActions'
import type { Task } from '@/types/domain'
import { minutesToPx } from './lib/timeGeometry'

interface TaskTimeChipProps {
  task: Task
  minutes: number
}

/**
 * A task with a time of day, drawn on the grid as a thin ruled line rather than a filled block.
 *
 * A task is a commitment, not an appointment: it gets no category colour and no box, so it cannot
 * be mistaken for an event. It still toggles in place, the same as the chip in the month view.
 */
export const TaskTimeChip = memo(function TaskTimeChip({ task, minutes }: TaskTimeChipProps) {
  const project = useProjectStore((s) => s.items).find((p) => p.id === task.projectId)
  const done = task.status === 'done'

  const toggle = () => {
    const run = () => changeStatus(task, done ? 'todo' : 'done')
    run().catch(() => toastWithRetry('Task belum bisa diperbarui.', run))
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      onClick={toggle}
      title={`${task.title} · ${STATUS_LABEL[task.status]}${project ? ` · ${project.name}` : ''}`}
      className={cn(
        'absolute inset-x-0.5 z-[5] flex items-center gap-1.5 overflow-hidden rounded-chip border border-dashed px-1.5 text-left text-xs transition-colors duration-fast hover:bg-sunken',
        done ? 'text-muted line-through' : 'text-ink',
      )}
      style={{ top: minutesToPx(minutes) }}
    >
      <span aria-hidden className="h-3.5 w-[3px] shrink-0 rounded-full border border-muted" />
      <span className={cn('truncate', done ? '' : 'font-medium')}>{task.title}</span>
    </button>
  )
})