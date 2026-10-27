import { describe, expect, it } from 'vitest'
import { makeTask } from '@/lib/testing'
import { columnsFromTasks, describePlace, fullIndexFor, placeOf, previewMove } from './boardDrag'

const tasks = [
  makeTask({ id: 'a', status: 'todo', order: 1000 }),
  makeTask({ id: 'b', status: 'todo', order: 2000 }),
  makeTask({ id: 'c', status: 'todo', order: 3000 }),
  makeTask({ id: 'd', status: 'doing', order: 1000 }),
  makeTask({ id: 'e', status: 'doing', order: 2000 }),
]
const columns = columnsFromTasks(tasks)

describe('columnsFromTasks', () => {
  it('groups by status in manual order, ties broken stably', () => {
    expect(columns).toEqual({ todo: ['a', 'b', 'c'], doing: ['d', 'e'], review: [], done: [] })
    const tied = columnsFromTasks([makeTask({ id: 'z', order: 5 }), makeTask({ id: 'y', order: 5 })])
    expect(tied.todo).toEqual(['y', 'z'])
  })
})

describe('previewMove', () => {
  it('reorders inside a column when dropped on another card', () => {
    expect(previewMove(columns, 'a', 'c').todo).toEqual(['b', 'c', 'a'])
    expect(previewMove(columns, 'c', 'a').todo).toEqual(['c', 'a', 'b'])
  })

  it('returns the same object when nothing changes', () => {
    expect(previewMove(columns, 'a', 'a')).toBe(columns)
    expect(previewMove(columns, 'c', 'todo')).toBe(columns)
    expect(previewMove(columns, 'ghost', 'a')).toBe(columns)
    expect(previewMove(columns, 'a', 'ghost')).toBe(columns)
  })

  it('moves to the end of the same column when dropped on its empty area', () => {
    expect(previewMove(columns, 'a', 'todo').todo).toEqual(['b', 'c', 'a'])
  })

  it('crosses columns: at the index of the card it is over, or at the end of a column', () => {
    const over = previewMove(columns, 'b', 'e')
    expect(over.todo).toEqual(['a', 'c'])
    expect(over.doing).toEqual(['d', 'b', 'e'])
    expect(previewMove(columns, 'b', 'done').done).toEqual(['b'])
    expect(previewMove(columns, 'b', 'review').todo).toEqual(['a', 'c'])
  })

  it('does not mutate its input', () => {
    previewMove(columns, 'a', 'e')
    expect(columns.todo).toEqual(['a', 'b', 'c'])
  })
})

describe('placeOf and describePlace', () => {
  it('finds the column and position', () => {
    expect(placeOf(columns, 'e')).toEqual({ status: 'doing', index: 1, total: 2 })
    expect(placeOf(columns, 'ghost')).toBeNull()
  })

  it('reads out in Indonesian', () => {
    expect(describePlace('Rapikan', placeOf(columns, 'e'))).toBe('Task Rapikan, kolom Dikerjakan, posisi 2 dari 2.')
    expect(describePlace('Rapikan', null)).toBe('Task Rapikan.')
  })
})

describe('fullIndexFor', () => {
  it('equals the visible index when nothing is hidden', () => {
    const next = previewMove(columns, 'a', 'c')
    expect(fullIndexFor(tasks, 'a', next, 'todo')).toBe(2)
  })

  it('accounts for hidden cards: lands right after the visible card above it', () => {
    // b is hidden by a filter, so the visible todo column is a, c.
    const all = tasks
    const visible = columnsFromTasks(tasks.filter((t) => t.id !== 'b'))
    const next = previewMove(visible, 'a', 'c') // c, a
    // Full column without a is b, c. After c is index 2.
    expect(fullIndexFor(all, 'a', next, 'todo')).toBe(2)
  })

  it('uses the card below when it is dropped first', () => {
    const visible = columnsFromTasks(tasks.filter((t) => t.id !== 'a'))
    const next = previewMove(visible, 'c', 'b') // c, b
    // Full column without c is a, b. Before b is index 1.
    expect(fullIndexFor(tasks, 'c', next, 'todo')).toBe(1)
  })

  it('goes to the end of an empty visible column', () => {
    const next = previewMove(columns, 'a', 'review')
    expect(fullIndexFor(tasks, 'a', next, 'review')).toBe(0)
    const toDoing = previewMove(columns, 'a', 'doing')
    expect(fullIndexFor(tasks, 'a', toDoing, 'doing')).toBe(2)
  })
})
