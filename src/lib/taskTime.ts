import type { Task, TimeLogEntry } from '@/types/domain'

/** Everything tracked on the task, across all days. */
export const trackedMinutes = (task: Pick<Task, 'timeLog'>): number => task.timeLog.reduce((sum, e) => sum + e.minutes, 0)

/** Newest first. Same-day entries are already merged by the focus attribution, so this only orders. */
export const recentSessions = (task: Pick<Task, 'timeLog'>, limit = 5): TimeLogEntry[] =>
  [...task.timeLog].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit)

/** "45 m", "2 j", "1 j 30 m". Short on purpose, for cards and the panel alike. */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} m`
  return m === 0 ? `${h} j` : `${h} j ${m} m`
}

export interface EstimateUsage {
  tracked: number
  estimate: number
  /** 0 to 100, capped, for a bar. */
  percent: number
  /** Minutes past the estimate, 0 while within it. */
  over: number
}

/** Null without an estimate: tracked time alone is shown as a plain total. */
export function estimateUsage(task: Pick<Task, 'timeLog' | 'estimateMinutes'>): EstimateUsage | null {
  const estimate = task.estimateMinutes
  if (!estimate || estimate <= 0) return null
  const tracked = trackedMinutes(task)
  return { tracked, estimate, percent: Math.min(100, Math.round((tracked / estimate) * 100)), over: Math.max(0, tracked - estimate) }
}

/** Parses the estimate field. Blank clears it; anything that is not a whole number above zero is rejected as undefined. */
export function parseEstimate(value: string): number | undefined {
  const n = Number(value.trim())
  return Number.isInteger(n) && n > 0 && n <= 99 * 60 ? n : undefined
}
