import { describe, expect, it } from 'vitest'
import { eachDayOfInterval } from 'date-fns'
import { buildDayItems } from './calendarItems'
import { isMultiDay, layoutWeekBars } from './monthLayout'
import { expandRecurrence } from './recurrence'
import { makeEvent } from './testing'

const d = (day: number, h = 0, min = 0) => new Date(2026, 9, day, h, min)
const week = { start: d(5), end: d(12) }
const weekDays = eachDayOfInterval({ start: d(5), end: d(11) })
const filters = { hiddenCategoryIds: [], showTasks: true }

const layout = (events: ReturnType<typeof makeEvent>[], maxLanes = 3) => {
  const items = buildDayItems(events, [], week, filters)
  return layoutWeekBars(weekDays, [...items.values()], maxLanes)
}
const trip = (id: string, from: number, to: number) => makeEvent({ id, allDay: true, start: d(from), end: d(to + 1) })

describe('isMultiDay', () => {
  const occ = (start: Date, end: Date) => expandRecurrence([makeEvent({ start, end })], { start: d(1), end: d(30) })[0]

  it('treats a one-day all-day event as single-day', () => expect(isMultiDay(occ(d(6), d(7)))).toBe(false))
  it('treats a timed event ending at midnight as single-day', () => expect(isMultiDay(occ(d(6, 22), d(7)))).toBe(false))
  it('treats a timed event crossing midnight as multi-day', () => expect(isMultiDay(occ(d(6, 22), d(7, 2)))).toBe(true))
  it('treats a three-day all-day event as multi-day', () => expect(isMultiDay(occ(d(6), d(9)))).toBe(true))
})

describe('layoutWeekBars', () => {
  it('spans a multi-day event across its columns', () => {
    const { segments, laneCount } = layout([trip('a', 7, 9)])
    expect(segments).toHaveLength(1)
    expect(segments[0]).toMatchObject({ startCol: 2, endCol: 4, lane: 0, continuesBefore: false, continuesAfter: false })
    expect(laneCount).toBe(1)
  })

  it('stacks overlapping events in separate lanes', () => {
    const { segments, laneCount } = layout([trip('a', 6, 8), trip('b', 7, 9)])
    expect(segments.map((s) => s.lane).sort()).toEqual([0, 1])
    expect(laneCount).toBe(2)
  })

  it('lets events that do not touch share a lane', () => {
    const { segments, laneCount } = layout([trip('a', 5, 6), trip('b', 8, 9)])
    expect(segments.map((s) => s.lane)).toEqual([0, 0])
    expect(laneCount).toBe(1)
  })

  it('does not share a lane when one ends the column another starts', () => {
    const { segments } = layout([trip('a', 5, 7), trip('b', 7, 9)])
    expect(segments.map((s) => s.lane).sort()).toEqual([0, 1])
  })

  it('clips events that cross the week boundary and marks the continuation', () => {
    const { segments } = layout([trip('a', 3, 6), trip('b', 10, 14)])
    const a = segments.find((s) => s.occurrence.event.id === 'a')
    const b = segments.find((s) => s.occurrence.event.id === 'b')
    expect(a).toMatchObject({ startCol: 0, endCol: 1, continuesBefore: true, continuesAfter: false })
    expect(b).toMatchObject({ startCol: 5, endCol: 6, continuesBefore: false, continuesAfter: true })
  })

  it('drops bars beyond the lane limit', () => {
    const { segments, laneCount } = layout([trip('a', 5, 8), trip('b', 5, 8), trip('c', 5, 8), trip('d', 5, 8)], 3)
    expect(segments).toHaveLength(3)
    expect(laneCount).toBe(3)
  })

  it('ignores single-day events', () => {
    expect(layout([trip('a', 6, 6)]).segments).toHaveLength(0)
  })
})
