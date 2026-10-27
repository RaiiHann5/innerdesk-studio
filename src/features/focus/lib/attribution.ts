import { toISODate } from '@/lib/date'
import { useTaskStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'

/**
 * Credit a finished focus block to its task.
 *
 * The block adds minutes to today's time log and one to the task's focus count. It only ever adds:
 * resetting or skipping a timer should never take time away from work that happened.
 *
 * A task that was deleted, or already finished, is not an error. There is simply nothing to credit,
 * and the session itself is still recorded.
 */
export function creditTask(taskId: string | undefined, seconds: number, at: Date): void {
  if (!taskId || seconds <= 0) return
  const task = useTaskStore.getState().items.find((t) => t.id === taskId)
  if (!task) return

  const date = toISODate(at)
  const minutes = Math.max(1, Math.round(seconds / 60))
  const existing = task.timeLog.find((entry) => entry.date === date)

  const timeLog = existing
    ? task.timeLog.map((entry) => (entry.date === date ? { ...entry, minutes: entry.minutes + minutes } : entry))
    : [...task.timeLog, { date, minutes }]

  void useTaskStore
    .getState()
    .update(taskId, { timeLog, focusCount: (task.focusCount ?? 0) + 1 })
    .catch(() => useUiStore.getState().showToast('Waktu fokus belum bisa dicatat di task.'))
}