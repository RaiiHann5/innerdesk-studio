import { CheckSquare, Square } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { changeStatus } from '@/features/tasks/taskActions'
import { toastWithRetry } from '@/stores/retryToast'
import type { Task } from '@/types/domain'

interface TaskChipProps {
  task: Task
}

/** A task due that day. The whole chip is the checkbox, so it toggles in place without leaving the calendar. */
export function TaskChip({ task }: TaskChipProps) {
  const done = task.status === 'done'
  const Box = done ? CheckSquare : Square

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
      title={task.title}
      className="flex h-5 w-full min-w-0 items-center gap-1.5 rounded-chip px-1 text-left text-xs transition-colors duration-fast hover:bg-sunken"
    >
      <Box size={14} weight={done ? 'fill' : 'regular'} aria-hidden className="shrink-0 text-muted" />
      <span className={cn('truncate', done ? 'text-muted line-through' : 'font-medium')}>{task.title}</span>
    </button>
  )
}
