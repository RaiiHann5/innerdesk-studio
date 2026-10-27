import { useMemo } from 'react'
import { CalendarCheck } from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/cn'
import { fmt, isOverdue, isoDay } from '@/lib/date'
import type { Project, Task } from '@/types/domain'
import { PriorityTag } from './PriorityTag'
import { statusDot } from './StatusPill'

interface TaskTimelineProps {
  tasks: Task[]
  projectById: Map<string, Project>
  onOpen: (task: Task) => void
}

interface Group {
  key: string
  label: string
  overdue?: boolean
  tasks: Task[]
}

function groupByDue(tasks: Task[]): Group[] {
  const open = tasks.filter((t) => t.status !== 'done')
  const late = open.filter((t) => t.dueDate && isOverdue(t.dueDate))
  const upcoming = open.filter((t) => t.dueDate && !isOverdue(t.dueDate))
  const undated = open.filter((t) => !t.dueDate)

  const days = [...new Set(upcoming.map((t) => t.dueDate as string))].sort()
  const today = isoDay(0)

  return [
    ...(late.length ? [{ key: 'late', label: 'Terlambat', overdue: true, tasks: late }] : []),
    ...days.map((day) => ({
      key: day,
      label: day === today ? 'Hari ini' : fmt(day, 'EEE, d MMM'),
      tasks: upcoming.filter((t) => t.dueDate === day),
    })),
    ...(undated.length ? [{ key: 'none', label: 'Tanpa tenggat', tasks: undated }] : []),
  ]
}

/** Open tasks laid out along their due dates. Finished tasks are left out on purpose. */
export function TaskTimeline({ tasks, projectById, onOpen }: TaskTimelineProps) {
  const groups = useMemo(() => groupByDue(tasks), [tasks])

  if (groups.length === 0) {
    return <EmptyState icon={CalendarCheck} title="Tidak ada task terbuka" description="Semua task di tampilan ini sudah selesai." />
  }

  return (
    <ol className="rounded-card border bg-surface">
      {groups.map((group) => (
        <li key={group.key} className="grid gap-x-6 gap-y-2 border-b p-4 last:border-b-0 md:grid-cols-[9rem_1fr]">
          <h3 className={cn('font-ui text-sm font-medium tabular-nums md:pt-1.5', group.overdue && 'text-status-overdue')}>{group.label}</h3>
          <ul className="space-y-1">
            {group.tasks.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => onOpen(task)}
                  className="flex w-full items-center gap-3 rounded-control px-2 py-1.5 text-left transition-colors duration-fast hover:bg-sunken"
                >
                  <span aria-hidden className={cn('size-2 shrink-0 rounded-full', statusDot[task.status])} />
                  <span className="min-w-0 flex-1 truncate font-medium">{task.title}</span>
                  <span className="hidden max-w-48 truncate text-xs text-muted sm:inline">
                    {task.projectId ? projectById.get(task.projectId)?.name : ''}
                  </span>
                  <PriorityTag priority={task.priority} />
                </button>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}
