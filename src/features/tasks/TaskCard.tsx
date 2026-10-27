import { CalendarBlank, Clock, FolderSimple, ListChecks, NotePencil, Repeat } from '@phosphor-icons/react'
import { Pill } from '@/components/ui/Pill'
import { cn } from '@/lib/cn'
import { dueLabel, isOverdue } from '@/lib/date'
import { subtaskProgress } from '@/lib/subtasks'
import { recurrenceLabel } from '@/lib/taskRecurrence'
import { formatDuration } from '@/lib/taskTime'
import type { Project, Task } from '@/types/domain'
import { PriorityTag } from './PriorityTag'

interface TaskCardProps {
  task: Task
  project?: Project
}

export function TaskCard({ task, project }: TaskCardProps) {
  const done = task.status === 'done'
  const overdue = !!task.dueDate && !done && isOverdue(task.dueDate)
  const subtasks = subtaskProgress(task.subtasks)

  return (
    <article className="rounded-card border bg-surface p-3">
      <header className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tabular-nums text-muted">{task.id}</span>
        <PriorityTag priority={task.priority} />
      </header>
      <h3 className={cn('mt-2 font-ui text-base font-medium leading-snug', done && 'text-muted line-through decoration-faint')}>
        {task.title}
      </h3>
      {task.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{task.description}</p>}
      {project && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <FolderSimple size={14} aria-hidden />
          <span className="truncate">{project.name}</span>
        </p>
      )}
      {task.tags.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1" aria-label="Tag">
          {task.tags.map((tag) => (
            <li key={tag}>
              <Pill>{tag}</Pill>
            </li>
          ))}
        </ul>
      )}
      <footer className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t pt-2 text-xs text-muted">
        {task.dueDate ? (
          <span className={cn('flex items-center gap-1.5 tabular-nums', overdue && 'font-medium text-status-overdue')}>
            <CalendarBlank size={14} aria-hidden />
            <span className="sr-only">{overdue ? 'Terlambat, tenggat' : 'Tenggat'}</span>
            {dueLabel(task.dueDate)}
          </span>
        ) : (
          <span>Tanpa tenggat</span>
        )}
        {/* Each fact appears only when the task has it, so a plain task stays a plain card. */}
        <span className="flex items-center gap-3 tabular-nums">
          {subtasks && (
            <span className="flex items-center gap-1">
              <ListChecks size={14} aria-hidden />
              <span className="sr-only">Subtask selesai:</span>
              {subtasks.done}/{subtasks.total}
            </span>
          )}
          {task.estimateMinutes ? (
            <span className="flex items-center gap-1">
              <Clock size={14} aria-hidden />
              <span className="sr-only">Estimasi:</span>
              {formatDuration(task.estimateMinutes)}
            </span>
          ) : null}
          {task.recurrence && (
            <span className="flex items-center" title={recurrenceLabel(task.recurrence)}>
              <Repeat size={14} aria-hidden />
              <span className="sr-only">{recurrenceLabel(task.recurrence)}</span>
            </span>
          )}
          {task.noteCount > 0 && (
            <span className="flex items-center gap-1">
              <NotePencil size={14} aria-hidden />
              <span className="sr-only">Catatan:</span>
              {task.noteCount}
            </span>
          )}
        </span>
      </footer>
    </article>
  )
}
