import { addDays, addMinutes, differenceInCalendarDays, differenceInMinutes, format, parseISO, startOfDay } from 'date-fns'
import { toISODate } from '@/lib/date'
import type { CalendarEvent, NewEntity, RecurrenceFreq, ReminderOffset } from '@/types/domain'
import { MIN_EVENT_MINUTES } from '../lib/timeGeometry'

/** What the editor edits. The Event itself stays the single source of truth; this is only its form shape. */
export interface EventDraft {
  title: string
  /** yyyy-MM-dd, first day for a multi-day event. */
  date: string
  /** yyyy-MM-dd, exclusive. Only read when allDay. */
  endDate: string
  /** HH:mm */
  startTime: string
  endTime: string
  allDay: boolean
  repeat: RecurrenceFreq | 'none'
  link: string
  location: string
  description: string
  /** Empty string means "tanpa project". */
  projectId: string
  categoryId: string
  reminders: ReminderOffset[]
}

export const DEFAULT_START = '09:00'
export const DEFAULT_MINUTES = 60

export const REMINDER_OPTIONS: ReminderOffset[] = [10, 60, 1440]

export const REMINDER_LABEL: Record<ReminderOffset, string> = {
  10: '10 menit sebelumnya',
  60: '1 jam sebelumnya',
  1440: '1 hari sebelumnya',
}

export const REPEAT_OPTIONS: Array<{ value: RecurrenceFreq | 'none'; label: string }> = [
  { value: 'none', label: 'Tidak berulang' },
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
]

export type DraftErrors = { title?: string; time?: string }

export const hhmm = (date: Date) => format(date, 'HH:mm')

/** Local midnight of the given day, then the given wall-clock time on it. */
function combine(date: string, time: string): Date {
  const [hour, minute] = time.split(':').map(Number)
  const value = startOfDay(parseISO(date))
  value.setHours(hour, minute, 0, 0)
  return value
}

export const minutesBetween = (from: string, to: string) => {
  const [fh, fm] = from.split(':').map(Number)
  const [th, tm] = to.split(':').map(Number)
  return th * 60 + tm - (fh * 60 + fm)
}

/** Moving the start moves the end with it, so the duration the person chose survives. */
export function moveStart(draft: EventDraft, startTime: string): EventDraft {
  const length = minutesBetween(draft.startTime, draft.endTime)
  const end = addMinutes(combine(draft.date, startTime), length > 0 ? length : DEFAULT_MINUTES)
  return { ...draft, startTime, endTime: hhmm(end) }
}

/** All-day events always cover at least one day, and the end is the day after the last one. */
export function ensureAllDayEnd(draft: EventDraft): EventDraft {
  if (parseISO(draft.endDate) > parseISO(draft.date)) return draft
  return { ...draft, endDate: toISODate(addDays(parseISO(draft.date), 1)) }
}

export function blankDraft(day: Date, categoryId: string): EventDraft {
  const start = combine(toISODate(day), DEFAULT_START)
  return {
    title: '',
    date: toISODate(day),
    endDate: toISODate(addDays(day, 1)),
    startTime: DEFAULT_START,
    endTime: hhmm(addMinutes(start, DEFAULT_MINUTES)),
    allDay: false,
    repeat: 'none',
    link: '',
    location: '',
    description: '',
    projectId: '',
    categoryId,
    reminders: [],
  }
}

/**
 * The draft for an event. `occurrenceStart` slides it onto one repeat of a recurring event,
 * keeping the time of day and the length the series was created with.
 */
export function draftFromEvent(event: CalendarEvent, occurrenceStart?: string): EventDraft {
  const base = parseISO(event.start)
  const baseEnd = parseISO(event.end)
  const anchor = occurrenceStart ? parseISO(occurrenceStart) : base
  const start = event.allDay ? startOfDay(anchor) : combine(toISODate(anchor), hhmm(base))
  const end = event.allDay
    ? addDays(start, Math.max(1, differenceInCalendarDays(baseEnd, base)))
    : addMinutes(start, Math.max(MIN_EVENT_MINUTES, differenceInMinutes(baseEnd, base)))

  return ensureAllDayEnd({
    title: event.title,
    date: toISODate(start),
    endDate: toISODate(end),
    startTime: hhmm(start),
    endTime: hhmm(end),
    allDay: event.allDay,
    repeat: event.recurrence?.freq ?? 'none',
    link: event.link ?? '',
    location: event.location ?? '',
    description: event.description ?? '',
    projectId: event.projectId ?? '',
    categoryId: event.categoryId,
    reminders: [...event.reminders],
  })
}

export function validate(draft: EventDraft): DraftErrors {
  const errors: DraftErrors = {}
  if (!draft.title.trim()) errors.title = 'Judul event wajib diisi.'
  if (draft.allDay) {
    if (parseISO(draft.endDate) <= parseISO(draft.date)) errors.time = 'Tanggal selesai harus setelah tanggal mulai.'
  } else if (minutesBetween(draft.startTime, draft.endTime) <= 0) {
    errors.time = 'Waktu selesai harus setelah waktu mulai.'
  }
  return errors
}

/** The fields EventRepo is given. `original` keeps repeat exceptions and other rule details. */
export function toEventInput(draft: EventDraft, original?: CalendarEvent): NewEntity<CalendarEvent> {
  const start = draft.allDay ? startOfDay(parseISO(draft.date)) : combine(draft.date, draft.startTime)
  const end = draft.allDay ? startOfDay(parseISO(draft.endDate)) : combine(draft.date, draft.endTime)
  return {
    title: draft.title.trim(),
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: draft.allDay,
    categoryId: draft.categoryId,
    projectId: draft.projectId || undefined,
    location: draft.location.trim() || undefined,
    link: draft.link.trim() || undefined,
    description: draft.description.trim() || undefined,
    recurrence:
      draft.repeat === 'none'
        ? undefined
        : { ...original?.recurrence, freq: draft.repeat, exceptions: [...(original?.recurrence?.exceptions ?? [])] },
    reminders: [...draft.reminders].sort((a, b) => a - b),
  }
}

export function isSameDraft(a: EventDraft, b: EventDraft): boolean {
  return (
    a.title === b.title &&
    a.date === b.date &&
    a.endDate === b.endDate &&
    a.startTime === b.startTime &&
    a.endTime === b.endTime &&
    a.allDay === b.allDay &&
    a.repeat === b.repeat &&
    a.link === b.link &&
    a.location === b.location &&
    a.description === b.description &&
    a.projectId === b.projectId &&
    a.categoryId === b.categoryId &&
    a.reminders.length === b.reminders.length &&
    a.reminders.every((r, i) => r === b.reminders[i])
  )
}