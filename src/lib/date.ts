import { addDays, differenceInCalendarDays, endOfWeek, format, formatDistanceToNowStrict, parseISO, startOfWeek } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { WEEK_STARTS_ON } from '@/lib/config'

export const toISODate = (d: Date) => format(d, 'yyyy-MM-dd')
export const isoDay = (offset = 0, from = new Date()) => toISODate(addDays(from, offset))
export const fmt = (value: string | Date, pattern: string) =>
  format(typeof value === 'string' ? parseISO(value) : value, pattern, { locale: idLocale })

export const isOverdue = (iso: string) => iso < isoDay(0)

export function dueLabel(iso: string): string {
  const diff = differenceInCalendarDays(parseISO(iso), new Date())
  if (diff === 0) return 'Hari ini'
  if (diff === 1) return 'Besok'
  if (diff === -1) return 'Kemarin'
  return fmt(iso, 'd MMM')
}

/** dueLabel for use mid-sentence: "besok" is lowercased, "9 Des" is not. */
export const dueLabelInline = (iso: string) => {
  const label = dueLabel(iso)
  return /^\d/.test(label) ? label : label.toLowerCase()
}

export const timeAgo = (iso: string) => formatDistanceToNowStrict(parseISO(iso), { locale: idLocale, addSuffix: true })

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = Math.round(total % 60)
  return `${h} j ${String(m).padStart(2, '0')} m`
}

/** First and last day (yyyy-MM-dd, inclusive) of the calendar week that contains `today`. */
export function weekRange(today: string = isoDay(0)): { start: string; end: string } {
  const day = parseISO(today)
  return {
    start: toISODate(startOfWeek(day, { weekStartsOn: WEEK_STARTS_ON })),
    end: toISODate(endOfWeek(day, { weekStartsOn: WEEK_STARTS_ON })),
  }
}
