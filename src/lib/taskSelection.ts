/** Toggles one id in a selection. Returns a new set. */
export function toggleId(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

/**
 * Shift-click: selects everything between the last clicked row and this one, in the order the rows are shown.
 * Without an anchor (or when the anchor is no longer listed) it behaves like a plain toggle.
 */
export function selectRange(selected: ReadonlySet<string>, ordered: readonly string[], anchor: string | null, id: string): Set<string> {
  const a = anchor ? ordered.indexOf(anchor) : -1
  const b = ordered.indexOf(id)
  if (a < 0 || b < 0) return toggleId(selected, id)
  const [from, to] = a < b ? [a, b] : [b, a]
  const next = new Set(selected)
  for (const rowId of ordered.slice(from, to + 1)) next.add(rowId)
  return next
}

export type AllState = 'none' | 'some' | 'all'

export function allState(selected: ReadonlySet<string>, ordered: readonly string[]): AllState {
  const count = ordered.filter((id) => selected.has(id)).length
  return count === 0 ? 'none' : count === ordered.length ? 'all' : 'some'
}

/** Header checkbox: selects every listed row, or clears them when all are already selected. */
export const toggleAll = (selected: ReadonlySet<string>, ordered: readonly string[]): Set<string> =>
  allState(selected, ordered) === 'all' ? new Set() : new Set(ordered)

/** Drops ids that are no longer listed (filtered out, archived, deleted). Returns the same set when nothing was dropped. */
export function pruneSelection(selected: ReadonlySet<string>, ordered: readonly string[]): ReadonlySet<string> {
  const listed = new Set(ordered)
  const kept = [...selected].filter((id) => listed.has(id))
  return kept.length === selected.size ? selected : new Set(kept)
}
