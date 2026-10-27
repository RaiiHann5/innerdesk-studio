import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  getYear,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import { WEEK_STARTS_ON } from '@/lib/config'
import { fmt } from '@/lib/date'
import type { IsoRange } from '@/types/domain'
import type { DateRange } from './recurrence'

export type CalendarView = 'day' | 'week' | 'month' | 'year'

/** Width below which the layout is a phone layout: a single column and a bottom sheet. */
export const COMPACT_WIDTH = '(max-width: 639px)'

export const weekStart = (date: Date) => startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON })

/** The dates a view needs data for. Month always spans six rows, so neighbouring months are included. */
export function getVisibleRange(view: CalendarView, focused: Date): DateRange {
  switch (view) {
    case 'day': {
      const start = startOfDay(focused)
      return { start, end: addDays(start, 1) }
    }
    case 'week': {
      const start = weekStart(focused)
      return { start, end: addDays(start, 7) }
    }
    case 'month': {
      const start = weekStart(startOfMonth(focused))
      return { start, end: addDays(start, 42) }
    }
    case 'year': {
      const start = startOfYear(focused)
      return { start, end: addYears(start, 1) }
    }
  }
}

export const toIsoRange = (range: DateRange): IsoRange => ({
  start: range.start.toISOString(),
  end: range.end.toISOString(),
})

export function shiftDate(view: CalendarView, date: Date, direction: 1 | -1): Date {
  switch (view) {
    case 'day':
      return addDays(date, direction)
    case 'week':
      return addWeeks(date, direction)
    case 'month':
      return addMonths(date, direction)
    case 'year':
      return addYears(date, direction)
  }
}

export function periodTitle(view: CalendarView, date: Date): string {
  switch (view) {
    case 'day':
      return fmt(date, 'EEEE, d MMM yyyy')
    case 'month':
      return fmt(date, 'MMMM yyyy')
    case 'year':
      return String(getYear(date))
    case 'week': {
      const first = weekStart(date)
      const last = addDays(first, 6)
      if (isSameMonth(first, last)) return `${fmt(first, 'd')} - ${fmt(last, 'd MMM yyyy')}`
      if (getYear(first) === getYear(last)) return `${fmt(first, 'd MMM')} - ${fmt(last, 'd MMM yyyy')}`
      return `${fmt(first, 'd MMM yyyy')} - ${fmt(last, 'd MMM yyyy')}`
    }
  }
}

/** The range to fetch: what is visible plus one period either side, so paging feels instant. */
export function paddedRange(range: DateRange): DateRange {
  const span = range.end.getTime() - range.start.getTime()
  return { start: new Date(range.start.getTime() - span), end: new Date(range.end.getTime() + span) }
}
