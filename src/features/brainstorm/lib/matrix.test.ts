import { describe, expect, it } from 'vitest'
import type { Idea } from '@/types/domain'
import { QUADRANTS, groupByQuadrant, isQuickWin, quadrantOf, quadrantTitle, readRating, setRating, toggleRating } from './matrix'

const idea = (id: string, extra: Partial<Idea> = {}): Idea => ({ id, text: `Ide ${id}`, starred: false, createdAt: '2026-10-01T00:00:00.000Z', ...extra })

describe('readRating', () => {
  it('accepts 1, 2 and 3 and treats anything else as not rated', () => {
    expect([1, 2, 3].map(readRating)).toEqual([1, 2, 3])
    for (const bad of [0, 4, -1, 1.5, '2', null, undefined, NaN]) expect(readRating(bad)).toBeUndefined()
  })
})

describe('toggleRating', () => {
  it('replaces the score, and clears it when the same one is pressed again', () => {
    expect(toggleRating(undefined, 2)).toBe(2)
    expect(toggleRating(1, 3)).toBe(3)
    expect(toggleRating(3, 3)).toBeUndefined()
  })
})

describe('setRating', () => {
  it('sets and clears one axis without touching the other idea or the other axis', () => {
    const list = [idea('a', { effort: 1 }), idea('b')]
    const rated = setRating(list, 'a', 'impact', 3)
    expect(rated[0]).toMatchObject({ impact: 3, effort: 1 })
    expect(rated[1]).toBe(list[1])
    expect(setRating(rated, 'a', 'impact', undefined)[0].impact).toBeUndefined()
    expect(list[0].impact).toBeUndefined()
  })

  it('refuses a score outside 1 to 3', () => {
    expect(setRating([idea('a')], 'a', 'impact', 7 as never)[0].impact).toBeUndefined()
  })
})

describe('quadrantOf', () => {
  it('needs both axes', () => {
    expect(quadrantOf(idea('a'))).toBeUndefined()
    expect(quadrantOf(idea('a', { impact: 3 }))).toBeUndefined()
    expect(quadrantOf(idea('a', { effort: 1 }))).toBeUndefined()
  })

  it('puts each corner in its own quadrant', () => {
    expect(quadrantOf(idea('a', { impact: 3, effort: 1 }))).toBe('quickWin')
    expect(quadrantOf(idea('a', { impact: 3, effort: 3 }))).toBe('bigBet')
    expect(quadrantOf(idea('a', { impact: 1, effort: 1 }))).toBe('fillIn')
    expect(quadrantOf(idea('a', { impact: 1, effort: 3 }))).toBe('later')
  })

  it('counts the middle score toward the high side, so a quick win needs light effort', () => {
    expect(quadrantOf(idea('a', { impact: 2, effort: 1 }))).toBe('quickWin')
    expect(quadrantOf(idea('a', { impact: 3, effort: 2 }))).toBe('bigBet')
    expect(quadrantOf(idea('a', { impact: 2, effort: 2 }))).toBe('bigBet')
    expect(quadrantOf(idea('a', { impact: 1, effort: 2 }))).toBe('later')
  })

  it('treats a damaged score as missing', () => {
    expect(quadrantOf({ impact: 9 as never, effort: 1 })).toBeUndefined()
  })

  it('knows a quick win', () => {
    expect(isQuickWin(idea('a', { impact: 3, effort: 1 }))).toBe(true)
    expect(isQuickWin(idea('a', { impact: 3, effort: 3 }))).toBe(false)
    expect(isQuickWin(idea('a'))).toBe(false)
  })
})

describe('groupByQuadrant', () => {
  it('splits rated ideas into quadrants and keeps the rest unrated', () => {
    const ideas = [idea('a', { impact: 3, effort: 1 }), idea('b', { impact: 1, effort: 3 }), idea('c'), idea('d', { impact: 2 })]
    const groups = groupByQuadrant(ideas)
    expect(groups.byQuadrant.quickWin.map((i) => i.id)).toEqual(['a'])
    expect(groups.byQuadrant.later.map((i) => i.id)).toEqual(['b'])
    expect(groups.byQuadrant.bigBet).toEqual([])
    expect(groups.unrated.map((i) => i.id)).toEqual(['c', 'd'])
  })

  it('lists every idea exactly once', () => {
    const ideas = [idea('a', { impact: 3, effort: 1 }), idea('b'), idea('c', { impact: 1, effort: 1 }), idea('d', { impact: 3, effort: 3 })]
    const groups = groupByQuadrant(ideas)
    const all = [...groups.unrated, ...QUADRANTS.flatMap((q) => groups.byQuadrant[q.id])]
    expect(all.map((i) => i.id).sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('orders a quadrant starred first, then higher impact, then lighter effort, then capture order', () => {
    const ideas = [
      idea('plain1', { impact: 2, effort: 1 }),
      idea('strong', { impact: 3, effort: 1 }),
      idea('cheap', { impact: 3, effort: 1 }),
      idea('starred', { impact: 2, effort: 1, starred: true }),
      idea('plain2', { impact: 2, effort: 1 }),
    ]
    expect(groupByQuadrant(ideas).byQuadrant.quickWin.map((i) => i.id)).toEqual(['starred', 'strong', 'cheap', 'plain1', 'plain2'])
  })

  it('breaks an impact tie by the lighter effort', () => {
    const ideas = [idea('heavy', { impact: 3, effort: 3 }), idea('lighter', { impact: 3, effort: 2 })]
    expect(groupByQuadrant(ideas).byQuadrant.bigBet.map((i) => i.id)).toEqual(['lighter', 'heavy'])
  })

  it('puts starred unrated ideas first in the tray', () => {
    const groups = groupByQuadrant([idea('a'), idea('b', { starred: true })])
    expect(groups.unrated.map((i) => i.id)).toEqual(['b', 'a'])
  })

  it('does not change the list it is given', () => {
    const ideas = [idea('a', { impact: 1, effort: 1 }), idea('b', { impact: 3, effort: 1 })]
    const copy = [...ideas]
    groupByQuadrant(ideas)
    expect(ideas).toEqual(copy)
  })
})

describe('quadrantTitle', () => {
  it('names a quadrant, and the tray when there is none', () => {
    expect(quadrantTitle('quickWin')).toBe('Quick win')
    expect(quadrantTitle(undefined)).toBe('Belum dinilai')
  })
})
