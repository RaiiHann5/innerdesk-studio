import { addDays, parseISO } from 'date-fns'
import { fmt, toISODate } from '@/lib/date'
import type { MoodEntry, MoodLevel } from '@/types/domain'
import { average } from './insights'
import { MOOD_LABEL } from './levels'

export interface DayPoint {
  date: string
  /** Null for a day nothing was logged. */
  level: MoodLevel | null
}

/** One point per day for the `days` days ending on `today`, oldest first. */
export function lastDays(entries: MoodEntry[], days: number, today: string): DayPoint[] {
  const byDate = new Map(entries.map((e) => [e.date, e.level]))
  return Array.from({ length: days }, (_, i) => {
    const date = toISODate(addDays(parseISO(today), i - (days - 1)))
    return { date, level: byDate.get(date) ?? null }
  })
}

/** Runs of consecutive logged days. A gap ends a run, so the line is never drawn across a missing day. */
export function runsOf(points: DayPoint[]): Array<Array<{ index: number; level: MoodLevel }>> {
  const runs: Array<Array<{ index: number; level: MoodLevel }>> = []
  let current: Array<{ index: number; level: MoodLevel }> = []
  points.forEach((point, index) => {
    if (point.level === null) {
      if (current.length) runs.push(current)
      current = []
    } else {
      current.push({ index, level: point.level })
    }
  })
  if (current.length) runs.push(current)
  return runs
}

const number = (n: number) => n.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** The chart in words, for screen readers. */
export function trendSummary(points: DayPoint[]): string {
  const logged = points.filter((p): p is DayPoint & { level: MoodLevel } => p.level !== null)
  const span = `${points.length} hari terakhir`
  if (logged.length === 0) return `Grafik suasana hati ${span}. Belum ada catatan.`
  const avg = average(logged.map((p) => p.level)) ?? 0
  const high = logged.reduce((a, b) => (b.level > a.level ? b : a))
  const low = logged.reduce((a, b) => (b.level < a.level ? b : a))
  const recent = logged.slice(-3).map((p) => `${fmt(p.date, 'd MMM')} ${MOOD_LABEL[p.level].toLowerCase()}`)
  return [
    `Grafik suasana hati ${span}.`,
    `${logged.length} hari tercatat, rata-rata ${number(avg)} dari 5.`,
    `Tertinggi ${MOOD_LABEL[high.level].toLowerCase()} pada ${fmt(high.date, 'd MMM')}, terendah ${MOOD_LABEL[low.level].toLowerCase()} pada ${fmt(low.date, 'd MMM')}.`,
    `Catatan terakhir: ${recent.join(', ')}.`,
  ].join(' ')
}
