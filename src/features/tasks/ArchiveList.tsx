import { useState } from 'react'
import { ArrowCounterClockwise, CaretDown, CaretRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { fmt } from '@/lib/date'
import { toastWithRetry } from '@/stores/retryToast'
import type { Project, Task } from '@/types/domain'
import { unarchiveTask } from './taskActions'

interface ArchiveListProps {
  /** Archived tasks only. */
  tasks: Task[]
  projectById: Map<string, Project>
  onOpen: (task: Task) => void
}

/** Collapsed by default. Archived work stays out of the board, stats and calendar but is never lost. */
export function ArchiveList({ tasks, projectById, onOpen }: ArchiveListProps) {
  const [open, setOpen] = useState(false)
  if (tasks.length === 0) return null

  const Caret = open ? CaretDown : CaretRight
  const sorted = [...tasks].sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''))

  return (
    <section aria-labelledby="archive-heading" className="rounded-card border bg-surface">
      <h3 id="archive-heading" className="font-ui text-sm font-medium">
        <button type="button" aria-expanded={open} aria-controls="archive-list" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 rounded-card px-4 py-3 text-left">
          <Caret aria-hidden size={14} />
          Arsip
          <span className="tabular-nums text-muted">{tasks.length}</span>
        </button>
      </h3>
      {open && (
        <ul id="archive-list" className="divide-y border-t">
          {sorted.map((task) => (
            <li key={task.id} className="flex items-center gap-3 px-4 py-2">
              <button type="button" onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-base text-muted line-through decoration-faint">{task.title}</span>
                <span className="block truncate text-xs tabular-nums text-muted">
                  {task.projectId && projectById.get(task.projectId) ? `${projectById.get(task.projectId)?.name} · ` : ''}
                  {task.archivedAt ? `Diarsipkan ${fmt(task.archivedAt, 'd MMM')}` : ''}
                </span>
              </button>
              <Button onClick={() => unarchiveTask(task).catch(() => toastWithRetry('Task gagal dipulihkan.', () => unarchiveTask(task)))}>
                <ArrowCounterClockwise aria-hidden />
                Pulihkan
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
