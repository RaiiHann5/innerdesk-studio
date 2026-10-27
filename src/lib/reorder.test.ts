import { describe, expect, it } from 'vitest'
import { makeTask } from '@/lib/testing'
import type { Task } from '@/types/domain'
import { ORDER_STEP, appendOrder, columnOf, moveItem, placeTask, type OrderPatch } from './reorder'

const col = (...orders: number[]): Task[] => orders.map((order, i) => makeTask({ id: `t${i + 1}`, order, status: 'todo' }))

/** Applies patches and returns the resulting column as ids. */
const apply = (tasks: Task[], patches: OrderPatch[], status: Task['status'] = 'todo') => {
  const next = tasks.map((t) => {
    const p = patches.find((x) => x.id === t.id)
    return p ? { ...t, order: p.order, status: p.status ?? t.status } : t
  })
  return columnOf(next, status).map((t) => t.id)
}

describe('moveItem', () => {
  it('moves forward and backward', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
  })

  it('clamps the target and ignores a bad source', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a'])
    expect(moveItem(['a', 'b'], 5, 0)).toEqual(['a', 'b'])
  })

  it('does not change the input', () => {
    const input = ['a', 'b']
    moveItem(input, 0, 1)
    expect(input).toEqual(['a', 'b'])
  })
})

describe('appendOrder', () => {
  it('goes one step after the last task of the same status', () => {
    const tasks = [...col(1000, 3000), makeTask({ id: 'x', status: 'done', order: 9000 })]
    expect(appendOrder(tasks, 'todo')).toBe(3000 + ORDER_STEP)
    expect(appendOrder([], 'todo')).toBe(ORDER_STEP)
  })
})

describe('placeTask', () => {
  it('writes a single midpoint when a task moves between two neighbours', () => {
    const tasks = col(1000, 2000, 3000)
    const patches = placeTask(tasks, 't1', 'todo', 1)
    expect(patches).toEqual([{ id: 't1', order: 2500 }])
    expect(apply(tasks, patches)).toEqual(['t2', 't1', 't3'])
  })

  it('moves to the top and to the bottom', () => {
    const tasks = col(1000, 2000, 3000)
    expect(apply(tasks, placeTask(tasks, 't3', 'todo', 0))).toEqual(['t3', 't1', 't2'])
    expect(apply(tasks, placeTask(tasks, 't1', 'todo', 99))).toEqual(['t2', 't3', 't1'])
  })

  it('writes nothing when the task stays where it is', () => {
    const tasks = col(1000, 2000, 3000)
    expect(placeTask(tasks, 't2', 'todo', 1)).toEqual([])
  })

  it('returns the same patches for the same input', () => {
    const tasks = col(1000, 2000, 3000)
    expect(placeTask(tasks, 't1', 'todo', 2)).toEqual(placeTask(tasks, 't1', 'todo', 2))
  })

  it('changes the column and the position in one patch', () => {
    const tasks = [...col(1000, 2000), makeTask({ id: 'd1', status: 'doing', order: 1000 }), makeTask({ id: 'd2', status: 'doing', order: 2000 })]
    const patches = placeTask(tasks, 't1', 'doing', 1)
    expect(patches).toEqual([{ id: 't1', order: 1500, status: 'doing' }])
    expect(apply(tasks, patches, 'doing')).toEqual(['d1', 't1', 'd2'])
  })

  it('drops into an empty column', () => {
    const tasks = col(1000)
    expect(placeTask(tasks, 't1', 'review', 0)).toEqual([{ id: 't1', order: ORDER_STEP, status: 'review' }])
  })

  it('moving to an end of a tied column still needs only one patch', () => {
    const tasks = col(1000, 1000, 1000)
    const patches = placeTask(tasks, 't3', 'todo', 0)
    expect(patches).toHaveLength(1)
    expect(apply(tasks, patches)).toEqual(['t3', 't1', 't2'])
  })

  it('renumbers the whole column when inserting between tied orders, with a stable result', () => {
    const tasks = col(1000, 1000, 1000)
    const patches = placeTask(tasks, 't3', 'todo', 1)
    expect(apply(tasks, patches)).toEqual(['t1', 't3', 't2'])
    const next = tasks.map((t) => ({ ...t, order: patches.find((p) => p.id === t.id)?.order ?? t.order }))
    expect(new Set(next.map((t) => t.order)).size).toBe(3)
    expect(placeTask(tasks, 't3', 'todo', 1)).toEqual(patches)
  })

  it('renumbers when the gap has shrunk below the limit', () => {
    const tasks = col(1000, 1000.005, 5000)
    const patches = placeTask(tasks, 't3', 'todo', 1)
    expect(apply(tasks, patches)).toEqual(['t1', 't3', 't2'])
    expect(patches.length).toBeGreaterThan(1)
  })

  it('ignores archived tasks when counting positions', () => {
    const tasks = [...col(1000, 3000), makeTask({ id: 'old', order: 2000, status: 'todo', archivedAt: '2026-10-01T00:00:00.000Z' })]
    const patches = placeTask(tasks, 't2', 'todo', 0)
    expect(apply(tasks, patches)).toEqual(['t2', 't1'])
  })

  it('does nothing for an unknown task', () => {
    expect(placeTask(col(1000), 'nope', 'todo', 0)).toEqual([])
  })
})
