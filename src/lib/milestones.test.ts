import { describe, expect, it } from 'vitest'
import { addMilestone, milestoneProgress, removeMilestone, renameMilestone, setMilestoneDue, shiftMilestone, toggleMilestone } from './milestones'

const list = [
  { id: 'a', title: 'Satu', done: true, dueDate: '2026-10-01' },
  { id: 'b', title: 'Dua', done: false },
  { id: 'c', title: 'Tiga', done: false, dueDate: '2026-12-01' },
]

describe('milestones', () => {
  it('adds with or without a date, and ignores a blank title', () => {
    expect(addMilestone(list, ' Empat ', '2026-12-31', 'd').at(-1)).toEqual({ id: 'd', title: 'Empat', done: false, dueDate: '2026-12-31' })
    expect(addMilestone(list, 'Lima', undefined, 'e').at(-1)).toEqual({ id: 'e', title: 'Lima', done: false })
    expect(addMilestone(list, '  ')).toEqual(list)
  })

  it('toggles one without mutating', () => {
    expect(toggleMilestone(list, 'b').map((m) => m.done)).toEqual([true, true, false])
    expect(list[1].done).toBe(false)
  })

  it('renames, and keeps the old title when the new one is blank', () => {
    expect(renameMilestone(list, 'b', ' Baru ')[1].title).toBe('Baru')
    expect(renameMilestone(list, 'b', ' ')[1].title).toBe('Dua')
  })

  it('sets and clears a date', () => {
    expect(setMilestoneDue(list, 'b', '2026-11-11')[1]).toEqual({ id: 'b', title: 'Dua', done: false, dueDate: '2026-11-11' })
    const cleared = setMilestoneDue(list, 'a', undefined)[0]
    expect(cleared).toEqual({ id: 'a', title: 'Satu', done: true })
    expect('dueDate' in cleared).toBe(false)
  })

  it('removes and shifts, staying put at the ends', () => {
    expect(removeMilestone(list, 'b').map((m) => m.id)).toEqual(['a', 'c'])
    expect(shiftMilestone(list, 'c', -1).map((m) => m.id)).toEqual(['a', 'c', 'b'])
    expect(shiftMilestone(list, 'a', -1).map((m) => m.id)).toEqual(['a', 'b', 'c'])
    expect(shiftMilestone(list, 'c', 1).map((m) => m.id)).toEqual(['a', 'b', 'c'])
    expect(shiftMilestone(list, 'zzz', 1)).toEqual(list)
  })

  it('counts progress', () => {
    expect(milestoneProgress(list)).toEqual({ done: 1, total: 3 })
    expect(milestoneProgress([])).toEqual({ done: 0, total: 0 })
  })
})
