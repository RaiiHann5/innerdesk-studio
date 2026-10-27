import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare } from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui/EmptyState'
import { StoreGate } from '@/components/ui/StoreGate'
import { activeTasks } from '@/lib/taskQuery'
import { StatusPill } from '@/features/tasks/StatusPill'
import { TaskCard } from '@/features/tasks/TaskCard'
import { STATUS_LABEL } from '@/lib/labels'
import { useProjectStore, useTaskStore } from '@/stores/entities'
import type { Priority, TaskStatus } from '@/types/domain'
import { ViewSkeleton } from './ViewSkeleton'

const STORES = [useTaskStore, useProjectStore]
const COLUMNS: TaskStatus[] = ['todo', 'doing', 'review', 'done']
const PER_COLUMN = 4
const RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

function Board() {
  const allTasks = useTaskStore((s) => s.items)
  const tasks = useMemo(() => activeTasks(allTasks), [allTasks])
  const projects = useProjectStore((s) => s.items)
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  const columns = useMemo(
    () =>
      COLUMNS.map((status) => ({
        status,
        tasks: tasks
          .filter((t) => t.status === status)
          .sort((a, b) => RANK[a.priority] - RANK[b.priority] || (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9')),
      })),
    [tasks],
  )

  if (tasks.length === 0) {
    return <EmptyState icon={CheckSquare} title="Belum ada task" description="Tekan Ctrl+K dan tulis judul task untuk membuat yang pertama." />
  }

  return (
    <div className="relative flex gap-4 overflow-x-auto pb-2">
      {columns.map(({ status, tasks: list }) => (
        <section key={status} aria-label={STATUS_LABEL[status]} className="min-w-64 flex-1 space-y-3">
          <StatusPill status={status} count={list.length} />
          {list.length === 0 && <p className="rounded-card border border-dashed p-4 text-center text-sm text-muted">Belum ada task</p>}
          {list.slice(0, PER_COLUMN).map((t) => (
            <TaskCard key={t.id} task={t} project={t.projectId ? projectById.get(t.projectId) : undefined} />
          ))}
          {list.length > PER_COLUMN && (
            <Link to="/tasks" className="block px-1 text-sm text-muted hover:text-ink">
              Lihat {list.length - PER_COLUMN} lainnya di Task
            </Link>
          )}
        </section>
      ))}
    </div>
  )
}

export function TaskView() {
  return (
    <StoreGate stores={STORES} skeleton={<ViewSkeleton columns={4} />}>
      <Board />
    </StoreGate>
  )
}
