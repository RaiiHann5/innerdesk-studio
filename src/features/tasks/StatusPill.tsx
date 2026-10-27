import { cn } from '@/lib/cn'
import { STATUS_LABEL } from '@/lib/labels'
import type { TaskStatus } from '@/types/domain'

export const statusDot: Record<TaskStatus, string> = {
  todo: 'bg-status-todo',
  doing: 'bg-status-doing',
  review: 'bg-status-review',
  done: 'bg-status-done',
}

/** Column header pill: status dot, label and count. */
export function StatusPill({ status, count }: { status: TaskStatus; count: number }) {
  return (
    <span className="inline-flex h-7 items-center gap-2 rounded-control border bg-surface px-2.5 text-sm font-medium">
      <span aria-hidden className={cn('size-2 rounded-full', statusDot[status])} />
      {STATUS_LABEL[status]}
      <span className="tabular-nums text-muted">{count}</span>
    </span>
  )
}
