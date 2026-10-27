import { Timer } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { fmt } from '@/lib/date'
import { estimateUsage, formatDuration, recentSessions, trackedMinutes } from '@/lib/taskTime'
import type { Task } from '@/types/domain'

interface TaskTimeBlockProps {
  task: Task
  onStartFocus: () => void
}

/** Tracked time against the estimate, the latest sessions, and the way into the focus timer. */
export function TaskTimeBlock({ task, onStartFocus }: TaskTimeBlockProps) {
  const usage = estimateUsage(task)
  const total = trackedMinutes(task)
  const sessions = recentSessions(task)

  return (
    <section aria-labelledby="time-heading" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 id="time-heading" className="text-sm font-medium">
          Waktu dan fokus
        </h3>
        {task.status !== 'done' && (
          <Button onClick={onStartFocus}>
            <Timer aria-hidden />
            Mulai fokus
          </Button>
        )}
      </div>

      {usage ? (
        <div className="space-y-1.5">
          <p className="text-sm tabular-nums">
            {formatDuration(usage.tracked)} <span className="text-muted">dari estimasi {formatDuration(usage.estimate)}</span>
          </p>
          <ProgressBar label="Waktu terpakai dari estimasi" value={usage.percent} />
          {usage.over > 0 && <p className="text-xs tabular-nums text-muted">Lebih {formatDuration(usage.over)} dari estimasi.</p>}
        </div>
      ) : (
        <p className="text-sm tabular-nums text-muted">{total > 0 ? `${formatDuration(total)} tercatat.` : 'Belum ada waktu tercatat.'}</p>
      )}

      {task.focusCount > 0 && <p className="text-xs tabular-nums text-muted">{task.focusCount} blok fokus selesai.</p>}

      {sessions.length > 0 && (
        <ul aria-label="Sesi terbaru" className="divide-y rounded-control border text-sm">
          {sessions.map((entry) => (
            <li key={entry.date} className="flex items-center justify-between px-3 py-1.5 tabular-nums">
              <span className="text-muted">{fmt(entry.date, 'EEE, d MMM')}</span>
              <span>{formatDuration(entry.minutes)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
