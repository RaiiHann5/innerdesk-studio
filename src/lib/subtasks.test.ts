import { describe, expect, it } from 'vitest'
import { addSubtask, removeSubtask, renameSubtask, shiftSubtask, subtaskProgress, toggleSubtask } from './subtasks'

const list = [
  { id: 'a', title: 'Satu', done: true },
  { id: 'b', title: 'Dua', done: false },
  { id: 'c', title: 'Tiga', done: false },
]

describe('subtasks', () => {
  it('adds a trimmed subtask at the end and ignores a blank one', () => {
    expect(addSubtask(list, '  Empat ', 'd').at(-1)).toEqual({ id: 'd', title: 'Empat', done: false })
    expect(addSubtask(list, '   ')).toEqual(list)
  })

  it('toggles only the named subtask without mutating', () => {
    const next = toggleSubtask(list, 'b')
    expect(next.map((s) => s.done)).toEqual([true, true, false])
    expect(list[1].done).toBe(false)
  })

  it('renames, and removes a subtask whose title is cleared', () => {
    expect(renameSubtask(list, 'b', ' Dua baru ')[1].title).toBe('Dua baru')
    expect(renameSubtask(list, 'b', '  ').map((s) => s.id)).toEqual(['a', 'c'])
  })

  it('removes by id', () => {
    expect(removeSubtask(list, 'a').map((s) => s.id)).toEqual(['b', 'c'])
    expect(removeSubtask(list, 'zzz')).toEqual(list)
  })

  it('shifts up and down, and stays put at the ends or for an unknown id', () => {
    expect(shiftSubtask(list, 'b', -1).map((s) => s.id)).toEqual(['b', 'a', 'c'])
    expect(shiftSubtask(list, 'b', 1).map((s) => s.id)).toEqual(['a', 'c', 'b'])
    expect(shiftSubtask(list, 'a', -1).map((s) => s.id)).toEqual(['a', 'b', 'c'])
    expect(shiftSubtask(list, 'c', 1).map((s) => s.id)).toEqual(['a', 'b', 'c'])
    expect(shiftSubtask(list, 'x', 1)).toEqual(list)
  })

  it('reports progress, and null when there is nothing to report', () => {
    expect(subtaskProgress(list)).toEqual({ done: 1, total: 3 })
    expect(subtaskProgress([])).toBeNull()
  })
})
