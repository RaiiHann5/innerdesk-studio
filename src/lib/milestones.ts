import { moveItem } from '@/lib/reorder'
import type { Milestone } from '@/types/domain'

/** A fresh id that cannot collide with the seeded ones ("<project>-m1"). */
export const newMilestoneId = (): string => `m-${Math.random().toString(36).slice(2, 10)}`

/** Adds a milestone at the end. A blank title adds nothing and returns an equal list. */
export function addMilestone(list: readonly Milestone[], title: string, dueDate?: string, id: string = newMilestoneId()): Milestone[] {
  const clean = title.trim()
  if (!clean) return [...list]
  return [...list, { id, title: clean, done: false, ...(dueDate ? { dueDate } : {}) }]
}

export const toggleMilestone = (list: readonly Milestone[], id: string): Milestone[] =>
  list.map((m) => (m.id === id ? { ...m, done: !m.done } : m))

/** Renames one. A blank title keeps the old one: a milestone is never left without a name. */
export function renameMilestone(list: readonly Milestone[], id: string, title: string): Milestone[] {
  const clean = title.trim()
  return clean ? list.map((m) => (m.id === id ? { ...m, title: clean } : m)) : [...list]
}

/** Sets the date, or removes it when `dueDate` is empty. */
export function setMilestoneDue(list: readonly Milestone[], id: string, dueDate: string | undefined): Milestone[] {
  return list.map((m) => {
    if (m.id !== id) return m
    const { dueDate: _old, ...rest } = m
    return dueDate ? { ...rest, dueDate } : rest
  })
}

export const removeMilestone = (list: readonly Milestone[], id: string): Milestone[] => list.filter((m) => m.id !== id)

/** Moves one up (-1) or down (1). Stays put at either end or for an unknown id. */
export function shiftMilestone(list: readonly Milestone[], id: string, direction: -1 | 1): Milestone[] {
  const from = list.findIndex((m) => m.id === id)
  return from < 0 ? [...list] : moveItem(list, from, from + direction)
}

export interface MilestoneProgress {
  done: number
  total: number
}

export const milestoneProgress = (list: readonly Milestone[]): MilestoneProgress => ({ done: list.filter((m) => m.done).length, total: list.length })
