import { parseISO } from 'date-fns'
import { toISODate } from '@/lib/date'
import type { FocusSession } from '@/types/domain'

/**
 * Focused seconds per day, keyed by local date.
 *
 * This is the one place a list of sessions becomes a number per day, so the week chart and the
 * dashboard cannot disagree about how much time went in.
 *
 * `creditedTaskIds` is for a caller that also adds up task time logs. A completed focus block is
 * written to its task's log when it ends, so counting it here as well would count it twice; passing
 * the ids of the tasks that exist leaves those blocks to the log and keeps everything else, such as
 * blocks with no task, blocks whose task was deleted, and blocks stopped early.
 */
export function focusSecondsByDay(
  sessions: FocusSession[],
  creditedTaskIds?: ReadonlySet<string>,
): Map<string, number> {
  const totals = new Map<string, number>()
  for (const session of sessions) {
    if (session.mode !== 'focus') continue
    if (session.completed && session.taskId && creditedTaskIds?.has(session.taskId)) continue
    const key = toISODate(parseISO(session.startedAt))
    totals.set(key, (totals.get(key) ?? 0) + session.actualSeconds)
  }
  return totals
}

/** Every session that started on a given day, newest first. */
export const sessionsOn = (sessions: FocusSession[], day: Date): FocusSession[] =>
  sessions
    .filter((s) => toISODate(parseISO(s.startedAt)) === toISODate(day))
    .sort((a, b) => parseISO(b.startedAt).getTime() - parseISO(a.startedAt).getTime())

/** Finished focus blocks, and every second actually spent focusing, for the "hari ini" line. */
export function focusTotals(sessions: FocusSession[]) {
  const focus = sessions.filter((s) => s.mode === 'focus')
  return {
    count: focus.filter((s) => s.completed).length,
    seconds: focus.reduce((sum, s) => sum + s.actualSeconds, 0),
  }
}
