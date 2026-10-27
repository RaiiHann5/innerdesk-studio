import { moveItem } from '@/lib/reorder'
import type { Subtask } from '@/types/domain'

/** A fresh id that cannot collide with the seeded ones ("<task>-s1"). */
export const newSubtaskId = (): string => `s-${Math.random().toString(36).slice(2, 10)}`

/** Adds a subtask at the end. A blank title adds nothing and returns the same list. */
export function addSubtask(list: readonly Subtask[], title: string, id: string = newSubtaskId()): Subtask[] {
  const clean = title.trim()
  return clean ? [...list, { id, title: clean, done: false }] : [...list]
}

export const toggleSubtask = (list: readonly Subtask[], id: string): Subtask[] =>
  list.map((s) => (s.id === id ? { ...s, done: !s.done } : s))

/** Renames one. Clearing the title removes it, so an emptied row never lingers. */
export function renameSubtask(list: readonly Subtask[], id: string, title: string): Subtask[] {
  const clean = title.trim()
  return clean ? list.map((s) => (s.id === id ? { ...s, title: clean } : s)) : removeSubtask(list, id)
}

export const removeSubtask = (list: readonly Subtask[], id: string): Subtask[] => list.filter((s) => s.id !== id)

/** Moves one subtask up (-1) or down (1). Stays put at either end. */
export function shiftSubtask(list: readonly Subtask[], id: string, direction: -1 | 1): Subtask[] {
  const from = list.findIndex((s) => s.id === id)
  return from < 0 ? [...list] : moveItem(list, from, from + direction)
}

export interface SubtaskProgress {
  done: number
  total: number
}

/** Null when there are no subtasks, so a card can leave the line out instead of showing "0/0". */
export function subtaskProgress(list: readonly Subtask[]): SubtaskProgress | null {
  if (list.length === 0) return null
  return { done: list.filter((s) => s.done).length, total: list.length }
}
