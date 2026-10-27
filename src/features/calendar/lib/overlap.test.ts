import { describe, expect, it } from 'vitest'
import { layoutDay, type Timed } from './overlap'

const DAY = new Date(2026, 9, 10)
const at = (hour: number, minute = 0, dayOffset = 0) => new Date(2026, 9, 10 + dayOffset, hour, minute)
const slot = (name: string, from: Date, to: Date): Timed & { name: string } => ({ name, start: from, end: to })

const byName = (placed: ReturnType<typeof layoutDay<Timed & { name: string }>>) =>
  Object.fromEntries(placed.map((p) => [p.item.name, p]))

describe('layoutDay', () => {
  it('gives a lone event the full width', () => {
    const [only] = layoutDay([slot('a', at(9), at(10))], DAY, 20)
    expect(only).toMatchObject({ startMin: 540, endMin: 600, column: 0, columns: 1, span: 1 })
  })

  it('keeps back-to-back events in the same column', () => {
    const p = byName(layoutDay([slot('a', at(9), at(10)), slot('b', at(10), at(11))], DAY, 20))
    expect([p.a.column, p.b.column, p.a.columns, p.b.columns]).toEqual([0, 0, 1, 1])
  })

  it('places identical times side by side', () => {
    const placed = layoutDay([slot('a', at(9), at(10)), slot('b', at(9), at(10)), slot('c', at(9), at(10))], DAY, 20)
    expect(placed.map((p) => p.column).sort()).toEqual([0, 1, 2])
    expect(placed.every((p) => p.columns === 3 && p.span === 1)).toBe(true)
  })

  it('packs a chain where A-B and B-C overlap but A-C do not', () => {
    const p = byName(
      layoutDay([slot('a', at(14), at(15, 30)), slot('b', at(15), at(16)), slot('c', at(15, 30), at(17))], DAY, 20),
    )
    expect(p.a.column).toBe(0)
    expect(p.b.column).toBe(1)
    // C starts exactly when A ends, so it reuses A's column instead of opening a third one.
    expect(p.c.column).toBe(0)
    expect([p.a.columns, p.b.columns, p.c.columns]).toEqual([2, 2, 2])
  })

  it('lets an event grow into columns that are free for its whole duration', () => {
    const p = byName(
      layoutDay(
        [slot('long', at(9), at(12)), slot('n', at(9), at(10)), slot('p', at(9), at(10)), slot('m', at(10), at(11))],
        DAY,
        20,
      ),
    )
    expect([p.long.column, p.n.column, p.p.column, p.m.column]).toEqual([0, 1, 2, 1])
    // The third column is only busy before 10:00, so m widens into it; long is blocked on its right for its whole length.
    expect([p.m.span, p.long.span, p.p.span]).toEqual([2, 1, 1])
  })

  it('starts a fresh cluster after a gap, so earlier crowding does not narrow later events', () => {
    const p = byName(
      layoutDay([slot('a', at(9), at(10)), slot('b', at(9), at(10)), slot('later', at(13), at(14))], DAY, 20),
    )
    expect(p.later).toMatchObject({ column: 0, columns: 1 })
  })

  it('counts the minimum drawn height as occupied time', () => {
    const p = byName(layoutDay([slot('tiny', at(9), at(9, 5)), slot('next', at(9, 10), at(10))], DAY, 30))
    expect(p.tiny.endMin).toBe(570)
    expect([p.tiny.column, p.next.column]).toEqual([0, 1])
  })

  it('clips an event that runs past midnight and marks the continuation', () => {
    const late = slot('late', at(22), at(2, 0, 1))
    const [today] = layoutDay([late], DAY, 20)
    expect(today).toMatchObject({ startMin: 1320, endMin: 1440, continuesBefore: false, continuesAfter: true })
    const [tomorrow] = layoutDay([late], new Date(2026, 9, 11), 20)
    expect(tomorrow).toMatchObject({ startMin: 0, endMin: 120, continuesBefore: true, continuesAfter: false })
  })

  it('lays the midnight tail of one event beside an early morning event', () => {
    const p = byName(
      layoutDay([slot('tail', at(22), at(1, 0, 1)), slot('early', at(0, 30, 1), at(1, 30, 1))], new Date(2026, 9, 11), 20),
    )
    expect([p.tail.column, p.early.column, p.tail.columns]).toEqual([0, 1, 2])
  })

  it('ignores events on other days, including one that ends exactly at midnight', () => {
    const items = [slot('yesterday', at(20, 0, -1), at(0)), slot('tomorrow', at(0, 0, 1), at(1, 0, 1))]
    expect(layoutDay(items, DAY, 20)).toEqual([])
  })

  it('keeps a late short event inside the day', () => {
    const [late] = layoutDay([slot('late', at(23, 50), at(23, 55))], DAY, 30)
    expect(late.endMin).toBe(1440)
  })
})
