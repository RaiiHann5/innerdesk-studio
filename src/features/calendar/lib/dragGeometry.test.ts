import { describe, expect, it } from 'vitest'
import { toISODate } from '@/lib/date'
import type { DayItems } from './calendarItems'
import {
  allDayShift,
  clampMinutes,
  dayDelta,
  draftOccurrence,
  moveSpan,
  placementPatch,
  pointerToSlot,
  resizeSpan,
  slotFromGrab,
  snapMinutes,
  withPreview,
  type GridRect,
} from './dragGeometry'
import { expandRecurrence, type Occurrence } from './recurrence'
import { makeEvent } from './testing'

const d = (day: number, h = 0, min = 0) => new Date(2026, 9, day, h, min)
/** A 1000x1344 hour area (24h at 56px) split over seven columns. */
const rect: GridRect = { left: 0, top: 0, width: 700, height: 1344, days: 7 }
const days = Array.from({ length: 7 }, (_, i) => d(5 + i))
const bucket = (timed: Occurrence[] = []): DayItems => ({ allDay: [], timed, tasks: [], timedTasks: [], milestones: [], count: timed.length })
const empty = new Map<string, DayItems>(days.map((day) => [toISODate(day), bucket()]))

describe('snapping', () => {
  it('rounds to the nearest quarter hour', () => {
    expect(snapMinutes(0)).toBe(0)
    expect(snapMinutes(7)).toBe(0)
    expect(snapMinutes(8)).toBe(15)
    expect(snapMinutes(22)).toBe(15)
    expect(snapMinutes(23)).toBe(30)
    expect(snapMinutes(59)).toBe(60)
  })

  it('keeps a slot inside the day', () => {
    expect(clampMinutes(-40)).toBe(0)
    expect(clampMinutes(9999)).toBe(24 * 60)
  })
})

describe('pointerToSlot', () => {
  it('reads the day column from the x position', () => {
    expect(pointerToSlot(rect, { x: 10, y: 0 }).dayIndex).toBe(0)
    expect(pointerToSlot(rect, { x: 110, y: 0 }).dayIndex).toBe(1)
    expect(pointerToSlot(rect, { x: 690, y: 0 }).dayIndex).toBe(6)
  })

  it('converts y to minutes from the top of the grid', () => {
    // 56px per hour, so y=56 is 09:00 only once the day starts at 00:00: 60 minutes per 56px.
    expect(pointerToSlot(rect, { x: 10, y: 56 }).minutes).toBe(60)
    expect(pointerToSlot(rect, { x: 10, y: 672 }).minutes).toBe(720)
  })

  it('clamps a pointer dragged past the edges', () => {
    expect(pointerToSlot(rect, { x: -500, y: -500 })).toEqual({ dayIndex: 0, minutes: 0 })
    expect(pointerToSlot(rect, { x: 5000, y: 5000 })).toEqual({ dayIndex: 6, minutes: 1440 })
  })

  it('accounts for a grid that is scrolled or offset', () => {
    const offset: GridRect = { left: 120, top: 300, width: 700, height: 1344, days: 7 }
    expect(pointerToSlot(offset, { x: 170, y: 300 })).toEqual({ dayIndex: 0, minutes: 0 })
    expect(pointerToSlot(offset, { x: 130, y: 328 })).toEqual({ dayIndex: 0, minutes: 30 })
  })
})

describe('grabbing', () => {
  it('keeps the offset the block was grabbed at', () => {
    // Grabbed 15 minutes into a block, so the pointer at 10:00 puts the start at 09:45.
    expect(slotFromGrab({ dayIndex: 2, minutes: 600 }, 15)).toEqual({ dayIndex: 2, minutes: 585 })
  })

  it('will not push the start above midnight', () => {
    expect(slotFromGrab({ dayIndex: 0, minutes: 10 }, 30).minutes).toBe(0)
  })
})

describe('moveSpan', () => {
  it('keeps the duration of the block', () => {
    expect(moveSpan(90, 0, { dayIndex: 1, minutes: 600 })).toEqual({ startMin: 600, endMin: 690 })
  })

  it('snaps the resulting start', () => {
    expect(moveSpan(60, 0, { dayIndex: 0, minutes: 605 }).startMin).toBe(600)
  })

  it('clamps a block that would run past the end of the day', () => {
    expect(moveSpan(120, 0, { dayIndex: 0, minutes: 1380 })).toEqual({ startMin: 1380, endMin: 1440 })
  })
})

describe('resizeSpan', () => {
  const current = { startMin: 600, endMin: 720 }

  it('moves the start edge and keeps the end', () => {
    expect(resizeSpan(current, 'start', 540)).toEqual({ startMin: 540, endMin: 720 })
  })

  it('moves the end edge and keeps the start', () => {
    expect(resizeSpan(current, 'end', 780)).toEqual({ startMin: 600, endMin: 780 })
  })

  it('will not collapse the span past the minimum', () => {
    expect(resizeSpan(current, 'start', 700)).toEqual({ startMin: 705, endMin: 720 })
    expect(resizeSpan(current, 'end', 610)).toEqual({ startMin: 600, endMin: 615 })
  })

  it('keeps the span inside the day', () => {
    expect(resizeSpan(current, 'start', -100)).toEqual({ startMin: 0, endMin: 720 })
    expect(resizeSpan(current, 'end', 9999)).toEqual({ startMin: 600, endMin: 1440 })
  })

  it('snaps both edges to the quarter hour', () => {
    expect(resizeSpan(current, 'end', 758).endMin).toBe(765)
  })
})

describe('dayDelta', () => {
  it('counts whole days between two starts', () => {
    expect(dayDelta(d(5, 9), d(8, 14))).toBe(3)
    expect(dayDelta(d(8), d(5))).toBe(-3)
  })

  it('ignores the time of day', () => {
    expect(dayDelta(d(5, 23), d(6, 1))).toBe(1)
  })
})

describe('placementPatch', () => {
  it('writes an ISO pair on the target day at the target times', () => {
    const event = makeEvent({ start: d(5, 9), end: d(5, 10) })
    const occurrence = expandRecurrence([event], { start: d(5), end: d(12) })[0]
    const patch = placementPatch(occurrence, d(8), 540, 630)
    expect(new Date(patch.start).getDate()).toBe(8)
    expect(new Date(patch.start).getHours()).toBe(9)
    expect(new Date(patch.end).getHours()).toBe(10)
  })
})

describe('allDayShift', () => {
  it('keeps the number of days when the start moves', () => {
    const trip = makeEvent({ allDay: true, start: d(5), end: d(8) })
    const occurrence = expandRecurrence([trip], { start: d(5), end: d(12) })[0]
    const patch = allDayShift(occurrence, 2)
    expect(new Date(patch.start).getDate()).toBe(7)
    expect(new Date(patch.end).getDate()).toBe(10)
  })

  it('can shift backwards', () => {
    const trip = makeEvent({ allDay: true, start: d(10), end: d(11) })
    const occurrence = expandRecurrence([trip], { start: d(5), end: d(12) })[0]
    expect(new Date(allDayShift(occurrence, -3).start).getDate()).toBe(7)
  })
})

describe('draftOccurrence', () => {
  it('describes the block being drawn on empty space', () => {
    const preview = draftOccurrence(d(5), 540, 600, 'cat-kerja')
    expect(preview.start.getHours()).toBe(9)
    expect(preview.end.getHours()).toBe(10)
    expect(preview.instanceKey).toBe('preview')
    expect(preview.event.categoryId).toBe('cat-kerja')
  })
})

describe('withPreview', () => {
  const build = () => {
    const first = makeEvent({ id: 'a', title: 'Pertama', start: d(5, 9), end: d(5, 10) })
    const second = makeEvent({ id: 'b', title: 'Kedua', start: d(5, 11), end: d(5, 12) })
    const [a, b] = expandRecurrence([first, second], { start: d(5), end: d(12) })
    const items = new Map<string, DayItems>()
    for (const day of days) {
      const dayKey = toISODate(day)
      const timed = [a, b].filter((o) => o.start.getDate() === day.getDate())
      items.set(dayKey, bucket(timed))
    }
    return { items, a }
  }

  it('removes the dragged event from its old day and slot', () => {
    const { items, a } = build()
    const moved = { ...a, start: d(7, 14), end: d(7, 15) }
    const next = withPreview(items, days, a, moved)
    expect(next.get(toISODate(days[0]))?.timed).toHaveLength(1)
    expect(next.get(toISODate(days[2]))?.timed).toHaveLength(1)
  })

  it('leaves the source map untouched', () => {
    const { items, a } = build()
    const before = items.get(toISODate(days[0]))?.timed.length
    withPreview(items, days, a, { ...a, start: d(7, 14), end: d(7, 15) })
    expect(items.get(toISODate(days[0]))?.timed.length).toBe(before)
  })

  it('adds the preview when a new event is being drawn', () => {
    const next = withPreview(empty, days, null, draftOccurrence(days[3], 600, 660, 'cat-kerja'))
    expect(next.get(toISODate(days[3]))?.timed).toHaveLength(1)
    expect(next.get(toISODate(days[0]))?.timed).toHaveLength(0)
  })

  it('never returns null for a day in the range', () => {
    const next = withPreview(empty, days, null, draftOccurrence(days[3], 600, 660, 'cat-kerja'))
    expect(next.get(toISODate(days[6]))).toBeDefined()
  })
})