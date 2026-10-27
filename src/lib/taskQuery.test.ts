import { describe, expect, it } from 'vitest'
import { makeProject, makeTask } from '@/lib/testing'
import {
  EMPTY_FILTERS,
  activeTasks,
  compareManual,
  filterTasks,
  groupTasks,
  matchesSmartView,
  smartViewCounts,
  sortManual,
} from './taskQuery'

// Wednesday. The week runs Monday 12 October to Sunday 18 October.
const TODAY = '2026-10-14'

describe('matchesSmartView', () => {
  it('today: only a task due today', () => {
    expect(matchesSmartView('today', makeTask({ dueDate: TODAY }), TODAY)).toBe(true)
    expect(matchesSmartView('today', makeTask({ dueDate: '2026-10-13' }), TODAY)).toBe(false)
    expect(matchesSmartView('today', makeTask({ dueDate: '2026-10-15' }), TODAY)).toBe(false)
  })

  it('week: Monday to Sunday of the current week, edges included, past days of the week too', () => {
    const due = (dueDate: string) => matchesSmartView('week', makeTask({ dueDate }), TODAY)
    expect(due('2026-10-11')).toBe(false)
    expect(due('2026-10-12')).toBe(true)
    expect(due('2026-10-13')).toBe(true)
    expect(due('2026-10-18')).toBe(true)
    expect(due('2026-10-19')).toBe(false)
  })

  it('week: on a Sunday the week is the one that ends today', () => {
    expect(matchesSmartView('week', makeTask({ dueDate: '2026-10-12' }), '2026-10-18')).toBe(true)
    expect(matchesSmartView('week', makeTask({ dueDate: '2026-10-19' }), '2026-10-18')).toBe(false)
  })

  it('overdue: before today only, and not today itself', () => {
    expect(matchesSmartView('overdue', makeTask({ dueDate: '2026-10-13' }), TODAY)).toBe(true)
    expect(matchesSmartView('overdue', makeTask({ dueDate: TODAY }), TODAY)).toBe(false)
    expect(matchesSmartView('overdue', makeTask(), TODAY)).toBe(false)
  })

  it('noDue, highPriority and noProject', () => {
    expect(matchesSmartView('noDue', makeTask(), TODAY)).toBe(true)
    expect(matchesSmartView('noDue', makeTask({ dueDate: TODAY }), TODAY)).toBe(false)
    expect(matchesSmartView('highPriority', makeTask({ priority: 'urgent' }), TODAY)).toBe(true)
    expect(matchesSmartView('highPriority', makeTask({ priority: 'high' }), TODAY)).toBe(true)
    expect(matchesSmartView('highPriority', makeTask({ priority: 'medium' }), TODAY)).toBe(false)
    expect(matchesSmartView('noProject', makeTask(), TODAY)).toBe(true)
    expect(matchesSmartView('noProject', makeTask({ projectId: 'prj-1' }), TODAY)).toBe(false)
  })

  it('a finished task matches no smart view', () => {
    const done = makeTask({ status: 'done', dueDate: '2026-10-01', priority: 'urgent' })
    for (const view of ['today', 'week', 'overdue', 'noDue', 'highPriority', 'noProject'] as const) {
      expect(matchesSmartView(view, done, TODAY)).toBe(false)
    }
  })
})

describe('smartViewCounts', () => {
  it('counts per view and leaves archived tasks out', () => {
    const counts = smartViewCounts(
      [
        makeTask({ id: 'a', dueDate: TODAY, priority: 'high' }),
        makeTask({ id: 'b', dueDate: '2026-10-12' }),
        makeTask({ id: 'c', dueDate: TODAY, archivedAt: '2026-10-01T00:00:00.000Z' }),
      ],
      TODAY,
    )
    expect(counts).toMatchObject({ today: 1, week: 2, overdue: 1, highPriority: 1, noProject: 2, noDue: 0 })
  })
})

describe('filterTasks', () => {
  const tasks = [
    makeTask({ id: 'open', dueDate: '2026-10-10', priority: 'high' }),
    makeTask({ id: 'low', dueDate: '2026-10-10', priority: 'low' }),
    makeTask({ id: 'old', archivedAt: '2026-10-01T00:00:00.000Z' }),
  ]
  const ids = (list: ReturnType<typeof filterTasks>) => list.map((t) => t.id)

  it('hides archived tasks by default and shows them on request', () => {
    expect(ids(filterTasks(tasks, EMPTY_FILTERS, TODAY))).toEqual(['open', 'low'])
    expect(ids(filterTasks(tasks, { ...EMPTY_FILTERS, archive: 'only' }, TODAY))).toEqual(['old'])
    expect(ids(filterTasks(tasks, { ...EMPTY_FILTERS, archive: 'include' }, TODAY))).toEqual(['open', 'low', 'old'])
  })

  it('combines a smart view with the other filters', () => {
    const f = { ...EMPTY_FILTERS, smart: 'overdue' as const, priorities: ['high' as const] }
    expect(ids(filterTasks(tasks, f, TODAY))).toEqual(['open'])
  })
})

describe('activeTasks', () => {
  it('drops archived tasks only', () => {
    const list = [makeTask({ id: 'a' }), makeTask({ id: 'b', archivedAt: '2026-10-01T00:00:00.000Z' })]
    expect(activeTasks(list).map((t) => t.id)).toEqual(['a'])
  })
})

describe('manual order', () => {
  it('sorts by order, then createdAt, then id, so ties never shuffle', () => {
    const list = [
      makeTask({ id: 'c', order: 1000, createdAt: '2026-02-01T00:00:00.000Z' }),
      makeTask({ id: 'b', order: 1000, createdAt: '2026-01-01T00:00:00.000Z' }),
      makeTask({ id: 'a', order: 1000, createdAt: '2026-01-01T00:00:00.000Z' }),
      makeTask({ id: 'z', order: 500 }),
    ]
    expect(sortManual(list).map((t) => t.id)).toEqual(['z', 'a', 'b', 'c'])
    expect(sortManual([...list].reverse()).map((t) => t.id)).toEqual(['z', 'a', 'b', 'c'])
    expect(compareManual(list[1], list[1])).toBe(0)
  })
})

describe('groupTasks', () => {
  it('by status: fixed column order, empty groups left out, input order kept inside', () => {
    const groups = groupTasks(
      [makeTask({ id: 'a', status: 'done' }), makeTask({ id: 'b', status: 'todo' }), makeTask({ id: 'c', status: 'done' })],
      'status',
    )
    expect(groups.map((g) => g.key)).toEqual(['todo', 'done'])
    expect(groups[1].tasks.map((t) => t.id)).toEqual(['a', 'c'])
    expect(groups[0].label).toBe('Belum mulai')
  })

  it('by priority: urgent first', () => {
    const groups = groupTasks([makeTask({ priority: 'low' }), makeTask({ priority: 'urgent' })], 'priority')
    expect(groups.map((g) => g.key)).toEqual(['urgent', 'low'])
  })

  it('by project: named projects alphabetically, unassigned last, a missing project counts as unassigned', () => {
    const projects = [makeProject({ id: 'p2', name: 'Zebra' }), makeProject({ id: 'p1', name: 'Alpha' })]
    const groups = groupTasks(
      [makeTask({ id: 'a', projectId: 'p2' }), makeTask({ id: 'b' }), makeTask({ id: 'c', projectId: 'p1' }), makeTask({ id: 'd', projectId: 'gone' })],
      'project',
      projects,
    )
    expect(groups.map((g) => g.label)).toEqual(['Alpha', 'Zebra', 'Tanpa project'])
    expect(groups[2].tasks.map((t) => t.id)).toEqual(['b', 'd'])
  })

  it('by due: buckets around today and the end of the week', () => {
    const at = (id: string, dueDate?: string, status: 'todo' | 'done' = 'todo') => makeTask({ id, dueDate, status })
    const groups = groupTasks(
      [
        at('none'),
        at('later', '2026-10-19'),
        at('sunday', '2026-10-18'),
        at('tomorrow', '2026-10-15'),
        at('today', TODAY),
        at('late', '2026-10-13'),
        at('finished', '2026-10-01', 'done'),
      ],
      'due',
      [],
      TODAY,
    )
    expect(groups.map((g) => [g.label, g.tasks.map((t) => t.id)])).toEqual([
      ['Terlambat', ['late']],
      ['Hari ini', ['today']],
      ['Minggu ini', ['sunday', 'tomorrow']],
      ['Nanti', ['later']],
      ['Sebelumnya', ['finished']],
      ['Tanpa tenggat', ['none']],
    ])
  })
})
