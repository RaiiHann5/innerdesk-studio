import { describe, expect, it } from 'vitest'
import { buildDayItems } from './calendarItems'
import { belongsInAllDayRow, gridOccurrences, layoutAllDayRow } from './allDayLayout'
import { makeEvent } from './testing'
import { toISODate } from '@/lib/date'
import { eachDayOfInterval } from 'date-fns'

// Monday 5 Oct to Sunday 11 Oct 2026.
const days = eachDayOfInterval({ start: new Date(2026, 9, 5), end: new Date(2026, 9, 11) })
const range = { start: days[0], end: new Date(2026, 9, 12) }
const filters = { hiddenCategoryIds: [], showTasks: true }
const build = (events: ReturnType<typeof makeEvent>[]) => {
  const map = buildDayItems(events, [], range, filters)
  return days.map((d) => map.get(toISODate(d))!)
}

describe('all-day row', () => {
  it('holds all-day events and trips, but not a late event that crosses midnight', () => {
    const items = build([
      makeEvent({ id: 'a', allDay: true, start: new Date(2026, 9, 7), end: new Date(2026, 9, 8) }),
      makeEvent({ id: 'trip', allDay: true, start: new Date(2026, 9, 8), end: new Date(2026, 9, 11) }),
      makeEvent({ id: 'late', start: new Date(2026, 9, 6, 22), end: new Date(2026, 9, 7, 2) }),
    ])
    const { segments } = layoutAllDayRow(days, items)
    expect(segments.map((s) => s.occurrence.event.id).sort()).toEqual(['a', 'trip'])
    expect(gridOccurrences(items[1]).map((o) => o.event.id)).toEqual(['late'])
    expect(gridOccurrences(items[2]).map((o) => o.event.id)).toEqual(['late'])
  })

  it('treats a timed event of 24 hours or more as multi-day', () => {
    const [o] = build([makeEvent({ start: new Date(2026, 9, 6, 9), end: new Date(2026, 9, 7, 9) })])[1].timed
    expect(belongsInAllDayRow(o)).toBe(true)
  })

  it('stacks overlapping bars into separate lanes and clips to the visible week', () => {
    const items = build([
      makeEvent({ id: 'wide', allDay: true, start: new Date(2026, 9, 3), end: new Date(2026, 9, 8) }),
      makeEvent({ id: 'one', allDay: true, start: new Date(2026, 9, 6), end: new Date(2026, 9, 7) }),
    ])
    const { segments, laneCount } = layoutAllDayRow(days, items)
    const wide = segments.find((s) => s.occurrence.event.id === 'wide')!
    expect(wide).toMatchObject({ startCol: 0, endCol: 2, continuesBefore: true, continuesAfter: false })
    expect(segments.find((s) => s.occurrence.event.id === 'one')!.lane).not.toBe(wide.lane)
    expect(laneCount).toBe(2)
  })

  it('works for a single day column', () => {
    const one = [days[2]]
    const items = [build([makeEvent({ allDay: true, start: new Date(2026, 9, 7), end: new Date(2026, 9, 8) })])[2]]
    expect(layoutAllDayRow(one, items).segments[0]).toMatchObject({ startCol: 0, endCol: 0 })
  })
})
