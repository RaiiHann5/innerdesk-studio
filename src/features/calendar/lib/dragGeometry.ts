import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns'
import { toISODate } from '@/lib/date'
import type { Category } from '@/types/domain'
import type { DayItems } from './calendarItems'
import { MINUTES_PER_DAY } from './overlap'
import type { Occurrence } from './recurrence'

/** Everything lands on a quarter hour. */
export const SNAP_MINUTES = 15
/** Shortest thing a resize will leave behind. */
export const MIN_DRAG_MINUTES = 15

export const snapMinutes = (minutes: number) => Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
export const clampMinutes = (minutes: number) => Math.min(MINUTES_PER_DAY, Math.max(0, minutes))

export interface Pointer {
  x: number
  y: number
}

/** The hour area: one column per visible day, `minutesPerPixel` derived from its height. */
export interface GridRect {
  left: number
  top: number
  width: number
  height: number
  days: number
}

export interface Slot {
  dayIndex: number
  minutes: number
}

/** Which day column and how far into it the pointer is, snapped. Coordinates outside the grid clamp to its edges. */
export function pointerToSlot(rect: GridRect, pointer: Pointer): Slot {
  const columnWidth = rect.width / rect.days
  const dayIndex = Math.min(rect.days - 1, Math.max(0, Math.floor((pointer.x - rect.left) / columnWidth)))
  const minutes = clampMinutes(snapMinutes(((pointer.y - rect.top) / rect.height) * MINUTES_PER_DAY))
  return { dayIndex, minutes }
}

/** Where a grabbed block sits: the pointer holds its original offset from the block's start. */
export function slotFromGrab(slot: Slot, grabOffsetMinutes: number): Slot {
  return { dayIndex: slot.dayIndex, minutes: clampMinutes(snapMinutes(slot.minutes - grabOffsetMinutes)) }
}

export interface Span {
  startMin: number
  endMin: number
}

/** Move keeps the length and the day, and never leaves the day the block was dropped in. */
export function moveSpan(durationMinutes: number, grabOffsetMinutes: number, slot: Slot): Span {
  const startMin = clampMinutes(snapMinutes(slot.minutes - grabOffsetMinutes))
  return { startMin, endMin: Math.min(MINUTES_PER_DAY, startMin + durationMinutes) }
}

/** Resize moves one edge. The other stays put and the span never collapses past the minimum. */
export function resizeSpan(current: Span, edge: 'start' | 'end', minutes: number): Span {
  const snapped = clampMinutes(snapMinutes(minutes))
  if (edge === 'start') {
    const startMin = Math.min(snapped, current.endMin - MIN_DRAG_MINUTES)
    return { startMin: Math.max(0, startMin), endMin: current.endMin }
  }
  const endMin = Math.max(snapped, current.startMin + MIN_DRAG_MINUTES)
  return { startMin: current.startMin, endMin: Math.min(MINUTES_PER_DAY, endMin) }
}

/** A dragged occurrence placed on a day and a time of day. Used for both the preview and the commit. */
export function placeOccurrence(occurrence: Occurrence, day: Date, startMin: number, endMin: number): Occurrence {
  const base = startOfDay(day)
  const start = new Date(base.getTime() + startMin * 60_000)
  const end = new Date(base.getTime() + endMin * 60_000)
  return { ...occurrence, start, end }
}

/** The placeholder shown while a new event is being drawn on empty space. */
export function draftOccurrence(day: Date, startMin: number, endMin: number, categoryId: string): Occurrence {
  const base = startOfDay(day)
  const start = new Date(base.getTime() + startMin * 60_000)
  const end = new Date(base.getTime() + endMin * 60_000)
  const event = {
    id: 'preview',
    title: 'Event baru',
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: false,
    categoryId,
    reminders: [],
    createdAt: start.toISOString(),
    updatedAt: start.toISOString(),
  }
  return { event, start, end, instanceKey: 'preview', isRecurring: false }
}

/** Whole days between the two starts, so a drop on another column moves the event by whole days. */
export const dayDelta = (from: Date, to: Date) => differenceInCalendarDays(startOfDay(to), startOfDay(from))

/** The event fields for a placement. An all-day event keeps its length in days and loses the clock time. */
export function placementPatch(occurrence: Occurrence, day: Date, startMin: number, endMin: number) {
  const placed = placeOccurrence(occurrence, day, startMin, endMin)
  return { start: placed.start.toISOString(), end: placed.end.toISOString() }
}

/** All-day events move by whole days and keep how many days they cover. */
export function allDayShift(occurrence: Occurrence, days: number) {
  const start = addDays(startOfDay(occurrence.start), days)
  const length = Math.max(1, differenceInCalendarDays(occurrence.end, occurrence.start))
  return { start: start.toISOString(), end: addDays(start, length).toISOString() }
}

/** Turns a day map into one where the dragged occurrence sits where the pointer is, so the overlap layout can recompute live. */
export function withPreview(
  items: Map<string, DayItems>,
  days: Date[],
  original: Occurrence | null,
  preview: Occurrence,
): Map<string, DayItems> {
  const next = new Map(items)
  for (const day of days) {
    // toISODate, not toISOString: day keys are local dates, and a UTC key would miss in most zones.
    const key = toISODate(day)
    const bucket = next.get(key)
    if (!bucket) continue
    const kept = original ? bucket.timed.filter((o) => o.instanceKey !== original.instanceKey) : bucket.timed
    const landsHere = differenceInCalendarDays(startOfDay(preview.start), day) === 0
    const timed = landsHere ? [...kept, preview] : kept
    if (timed.length === bucket.timed.length && timed.every((o, i) => o === bucket.timed[i])) continue
    next.set(key, { ...bucket, timed })
  }
  return next
}

/** Default category for a new event, so the preview has a colour before the editor is open. */
export const previewCategory = (categories: Category[]): string => categories[0]?.id ?? ''