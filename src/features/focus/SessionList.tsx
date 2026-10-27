import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import { format, parseISO } from 'date-fns'
import { Check, Minus } from '@phosphor-icons/react'
import { useTaskStore } from '@/stores/entities'
import type { FocusSession } from '@/types/domain'
import { sessionsOn } from './lib/focusSelectors'
import { MODE_LABEL, formatDuration } from './lib/time'

interface SessionListProps {
  sessions: FocusSession[]
  /** Defaults to today. */
  day?: Date
  /** Extra classes for the list itself, so a parent can cap its height and scroll it. */
  listClassName?: string
}

/**
 * "Hari ini": every session on one day, newest first, with what it was and whether it finished.
 *
 * A session whose task has since been deleted still appears, with the task simply missing. Losing
 * the record of work that happened would be worse than losing the label on it.
 */
export function SessionList({ sessions, day, listClassName }: SessionListProps) {
  const tasks = useTaskStore((s) => s.items)
  const titleById = useMemo(() => new Map(tasks.map((t) => [t.id, t.title])), [tasks])
  const onDay = useMemo(() => sessionsOn(sessions, day ?? new Date()), [sessions, day])
  const completed = onDay.filter((s) => s.completed).length

  return (
    <section aria-label="Sesi hari ini" className="space-y-2">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-bold">Hari ini</h2>
        {onDay.length > 0 && (
          <span className="text-xs text-muted">
            {completed} selesai dari {onDay.length}
          </span>
        )}
      </header>

      {onDay.length === 0 ? (
        <p className="rounded-card border border-dashed px-3 py-6 text-center text-sm text-muted">Belum ada sesi hari ini.</p>
      ) : (
        <ul className={cn('divide-y', listClassName)}>
          {onDay.map((session) => (
            <li key={session.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-11 shrink-0 text-xs tabular-nums text-muted">{format(parseISO(session.startedAt), 'HH:mm')}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{(session.taskId && titleById.get(session.taskId)) || MODE_LABEL[session.mode]}</span>
                <span className="block text-xs text-muted">
                  {session.taskId && titleById.has(session.taskId) ? `${MODE_LABEL[session.mode]}` : ''}
                  {!session.completed && `${session.taskId && titleById.has(session.taskId) ? ', ' : ''}dihentikan lebih awal`}
                </span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-muted">{formatDuration(session.actualSeconds)}</span>
              {session.completed ? (
                <Check aria-label="Selesai" size={14} weight="bold" className="shrink-0 text-status-done" />
              ) : (
                <Minus aria-label="Tidak selesai" size={14} weight="bold" className="shrink-0 text-muted" />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
