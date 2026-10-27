import type { Idea, IdeaRating } from '@/types/domain'
import { starredFirst } from './ideas'

export type RatingField = 'impact' | 'effort'
export type Quadrant = 'quickWin' | 'bigBet' | 'fillIn' | 'later'

export const RATINGS: readonly IdeaRating[] = [1, 2, 3]

export const FIELD_LABEL: Record<RatingField, string> = { impact: 'Dampak', effort: 'Usaha' }

export const RATING_LABEL: Record<RatingField, Record<IdeaRating, string>> = {
  impact: { 1: 'Rendah', 2: 'Sedang', 3: 'Tinggi' },
  effort: { 1: 'Ringan', 2: 'Sedang', 3: 'Berat' },
}

/** In the order the board draws them: the quick wins first, so on a phone they are the first thing under the tray. */
export const QUADRANTS: ReadonlyArray<{ id: Quadrant; title: string; hint: string }> = [
  { id: 'quickWin', title: 'Quick win', hint: 'Dampak tinggi, usaha ringan. Mulai dari sini.' },
  { id: 'bigBet', title: 'Proyek besar', hint: 'Dampak tinggi, usaha berat. Perlu rencana.' },
  { id: 'fillIn', title: 'Pelengkap', hint: 'Dampak rendah, usaha ringan. Kerjakan kalau sempat.' },
  { id: 'later', title: 'Tunda dulu', hint: 'Dampak rendah, usaha berat. Biasanya tidak sepadan.' },
]

export const UNRATED_TITLE = 'Belum dinilai'

/** The title of a quadrant, or of the tray when there is none. */
export const quadrantTitle = (quadrant: Quadrant | undefined): string => (quadrant ? (QUADRANTS.find((q) => q.id === quadrant)?.title ?? UNRATED_TITLE) : UNRATED_TITLE)

/**
 * From this score up counts as the high side of an axis. The middle score (Sedang) is on the high side of both, so an
 * idea only becomes a quick win when its effort is clearly light. Change this one number to move the line.
 */
const HIGH_FROM: IdeaRating = 2

/** Anything but 1, 2 or 3 counts as not rated, so a hand-edited or damaged value cannot put an idea in the wrong place. */
export const readRating = (value: unknown): IdeaRating | undefined => (value === 1 || value === 2 || value === 3 ? value : undefined)

/** Pressing the score an idea already has clears it; any other score replaces it. */
export const toggleRating = (current: IdeaRating | undefined, clicked: IdeaRating): IdeaRating | undefined => (current === clicked ? undefined : clicked)

/** Sets one axis of one idea, or clears it when `value` is undefined. */
export function setRating(list: readonly Idea[], id: string, field: RatingField, value: IdeaRating | undefined): Idea[] {
  const next = readRating(value)
  return list.map((i) => (i.id === id ? { ...i, [field]: next } : i))
}

/** The quadrant an idea sits in, or undefined while either axis is still missing. */
export function quadrantOf(idea: Pick<Idea, 'impact' | 'effort'>): Quadrant | undefined {
  const impact = readRating(idea.impact)
  const effort = readRating(idea.effort)
  if (!impact || !effort) return undefined
  const highImpact = impact >= HIGH_FROM
  const heavy = effort >= HIGH_FROM
  if (highImpact) return heavy ? 'bigBet' : 'quickWin'
  return heavy ? 'later' : 'fillIn'
}

export const isQuickWin = (idea: Pick<Idea, 'impact' | 'effort'>): boolean => quadrantOf(idea) === 'quickWin'

export interface MatrixGroups {
  /** Ideas missing one or both scores, starred first. */
  unrated: Idea[]
  byQuadrant: Record<Quadrant, Idea[]>
}

/** Starred first, then the higher impact, then the lighter effort. Stable, so ties keep capture order. */
const bestFirst = (ideas: readonly Idea[]): Idea[] =>
  [...ideas].sort(
    (a, b) => Number(b.starred) - Number(a.starred) || (readRating(b.impact) ?? 0) - (readRating(a.impact) ?? 0) || (readRating(a.effort) ?? 0) - (readRating(b.effort) ?? 0),
  )

/** Splits ideas into the four quadrants and the ones not yet rated. Does not change the list it is given. */
export function groupByQuadrant(ideas: readonly Idea[]): MatrixGroups {
  const byQuadrant: Record<Quadrant, Idea[]> = { quickWin: [], bigBet: [], fillIn: [], later: [] }
  const unrated: Idea[] = []
  for (const idea of ideas) {
    const quadrant = quadrantOf(idea)
    if (quadrant) byQuadrant[quadrant].push(idea)
    else unrated.push(idea)
  }
  for (const { id } of QUADRANTS) byQuadrant[id] = bestFirst(byQuadrant[id])
  return { unrated: starredFirst(unrated), byQuadrant }
}
