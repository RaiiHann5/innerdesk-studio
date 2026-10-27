import { describe, expect, it } from 'vitest'
import { makeProject, makeTask } from '@/lib/testing'
import { nextMilestone, projectHealth, projectProgress, projectSummary, projectTime } from './projectStats'

// Wednesday. The week runs Monday 12 October to Sunday 18 October.
const TODAY = '2026-10-14'
const plus = (days: number) => {
  const d = new Date(`${TODAY}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const P = 'prj-1'
const ARCHIVED = '2026-10-01T00:00:00.000Z'

/** `done` finished tasks and `open` open ones, none late, all in project P. */
const batch = (done: number, open: number) => [
  ...Array.from({ length: done }, (_, i) => makeTask({ id: `d${i}`, projectId: P, status: 'done' })),
  ...Array.from({ length: open }, (_, i) => makeTask({ id: `o${i}`, projectId: P })),
]
const level = (project: Parameters<typeof projectHealth>[0], tasks: Parameters<typeof projectHealth>[1]) => projectHealth(project, tasks, TODAY)

describe('projectProgress', () => {
  it('counts tasks and milestones as equal units', () => {
    const project = makeProject({
      milestones: [
        { id: 'm1', title: 'A', done: true },
        { id: 'm2', title: 'B', done: false },
      ],
    })
    expect(projectProgress(project, [makeTask({ projectId: P, status: 'done' }), makeTask({ id: 'b', projectId: P })])).toEqual({ done: 2, total: 4, percent: 50 })
  })

  it('ignores tasks of other projects', () => {
    expect(projectProgress(makeProject(), [makeTask({ projectId: 'other', status: 'done' })])).toEqual({ done: 0, total: 0, percent: 0 })
  })

  it('keeps finished archived tasks as done and drops unfinished archived ones', () => {
    const tasks = [
      makeTask({ id: 'a', projectId: P, status: 'done', archivedAt: ARCHIVED }),
      makeTask({ id: 'b', projectId: P, archivedAt: ARCHIVED }),
      makeTask({ id: 'c', projectId: P }),
    ]
    expect(projectProgress(makeProject(), tasks)).toEqual({ done: 1, total: 2, percent: 50 })
  })
})

describe('projectHealth: late work', () => {
  const late = (n: number) => Array.from({ length: n }, (_, i) => makeTask({ id: `l${i}`, projectId: P, dueDate: plus(-1) }))

  it('is Sehat with nothing late and no deadline', () => {
    expect(level(makeProject(), batch(1, 1))).toEqual({ level: 'sehat', reason: '' })
  })

  it('1 and 2 late tasks need attention, 3 is at risk', () => {
    expect(level(makeProject(), late(1))).toEqual({ level: 'perhatian', reason: '1 task terlambat' })
    expect(level(makeProject(), late(2))).toEqual({ level: 'perhatian', reason: '2 task terlambat' })
    expect(level(makeProject(), late(3))).toEqual({ level: 'berisiko', reason: '3 task terlambat' })
  })

  it('a task due today is not late; a finished or archived one is never late', () => {
    const tasks = [
      makeTask({ id: 'a', projectId: P, dueDate: TODAY }),
      makeTask({ id: 'b', projectId: P, dueDate: plus(-5), status: 'done' }),
      makeTask({ id: 'c', projectId: P, dueDate: plus(-5), archivedAt: ARCHIVED }),
    ]
    expect(level(makeProject(), tasks).level).toBe('sehat')
  })

  it('counts late milestones with late tasks and says so in one line', () => {
    const project = makeProject({ milestones: [{ id: 'm', title: 'M', dueDate: plus(-2), done: false }] })
    expect(level(project, [])).toEqual({ level: 'perhatian', reason: '1 milestone terlambat' })
    expect(level(project, late(2))).toEqual({ level: 'berisiko', reason: '2 task dan 1 milestone terlambat' })
  })
})

describe('projectHealth: deadline and progress', () => {
  const withDeadline = (days: number) => makeProject({ deadline: plus(days) })

  it('7 days left under 50% is at risk; 50% is on track', () => {
    expect(level(withDeadline(7), batch(49, 51))).toEqual({ level: 'berisiko', reason: 'Tenggat 7 hari lagi, progres 49%' })
    expect(level(withDeadline(7), batch(50, 50)).level).toBe('sehat')
  })

  it('8 and 14 days left under 50% need attention; 15 days is not flagged', () => {
    expect(level(withDeadline(8), batch(49, 51)).level).toBe('perhatian')
    expect(level(withDeadline(14), batch(49, 51)).level).toBe('perhatian')
    expect(level(withDeadline(15), batch(49, 51)).level).toBe('sehat')
  })

  it('the deadline day itself counts as 0 days left', () => {
    expect(level(withDeadline(0), batch(1, 3))).toEqual({ level: 'berisiko', reason: 'Tenggat hari ini, progres 25%' })
  })

  it('a passed deadline is at risk until the project is complete', () => {
    expect(level(withDeadline(-1), batch(1, 1))).toEqual({ level: 'berisiko', reason: 'Tenggat project sudah lewat' })
    expect(level(withDeadline(-1), batch(2, 0)).level).toBe('sehat')
  })

  it('a project with nothing planned has no progress to judge, but a passed deadline still counts', () => {
    expect(level(withDeadline(3), []).level).toBe('sehat')
    expect(level(withDeadline(-3), []).level).toBe('berisiko')
  })

  it('the worst signal wins and its reason is the one shown', () => {
    const tasks = [...batch(0, 4), makeTask({ id: 'late', projectId: P, dueDate: plus(-1) })]
    // 1 late task (attention) and 5 days left at 0% (at risk).
    expect(level(withDeadline(5), tasks)).toEqual({ level: 'berisiko', reason: 'Tenggat 5 hari lagi, progres 0%' })
    // Equal severity: the earlier rule, the passed deadline, is shown.
    expect(level(withDeadline(-2), [...tasks, makeTask({ id: 'l2', projectId: P, dueDate: plus(-1) }), makeTask({ id: 'l3', projectId: P, dueDate: plus(-1) })]).reason).toBe(
      'Tenggat project sudah lewat',
    )
  })

  it('a paused or finished project is Sehat whatever is late', () => {
    const lateTasks = [makeTask({ projectId: P, dueDate: plus(-9) })]
    expect(level(makeProject({ status: 'paused', deadline: plus(-3) }), lateTasks).level).toBe('sehat')
    expect(level(makeProject({ status: 'done', deadline: plus(-3) }), lateTasks).level).toBe('sehat')
  })
})

describe('projectTime', () => {
  const log = (date: string, minutes: number) => ({ date, minutes })

  it('splits this calendar week from the total, edges included', () => {
    const tasks = [
      makeTask({ projectId: P, timeLog: [log('2026-10-11', 30), log('2026-10-12', 20), log('2026-10-18', 10), log('2026-10-19', 40)] }),
      makeTask({ id: 'b', projectId: P, timeLog: [log(TODAY, 5)] }),
      makeTask({ id: 'c', projectId: 'other', timeLog: [log(TODAY, 999)] }),
    ]
    expect(projectTime(makeProject(), tasks, TODAY)).toEqual({ weekMinutes: 35, totalMinutes: 105 })
  })

  it('still counts time spent on an archived task', () => {
    const tasks = [makeTask({ projectId: P, archivedAt: ARCHIVED, timeLog: [log(TODAY, 25)] })]
    expect(projectTime(makeProject(), tasks, TODAY)).toEqual({ weekMinutes: 25, totalMinutes: 25 })
  })

  it('is zero with no log', () => {
    expect(projectTime(makeProject(), [], TODAY)).toEqual({ weekMinutes: 0, totalMinutes: 0 })
  })
})

describe('nextMilestone', () => {
  const ms = (id: string, dueDate?: string, done = false) => ({ id, title: id, dueDate, done })

  it('is the earliest dated milestone still open, even when it is overdue', () => {
    const project = makeProject({ milestones: [ms('late', '2026-10-30'), ms('early', '2026-10-01'), ms('done', '2026-09-01', true)] })
    expect(nextMilestone(project)?.id).toBe('early')
  })

  it('puts undated milestones after the dated ones, in the order given', () => {
    expect(nextMilestone(makeProject({ milestones: [ms('x'), ms('y', '2026-11-01')] }))?.id).toBe('y')
    expect(nextMilestone(makeProject({ milestones: [ms('x'), ms('z')] }))?.id).toBe('x')
  })

  it('is null when there are none or all are done', () => {
    expect(nextMilestone(makeProject())).toBeNull()
    expect(nextMilestone(makeProject({ milestones: [ms('a', undefined, true)] }))).toBeNull()
  })
})

describe('projectSummary', () => {
  it('agrees with the individual selectors', () => {
    const project = makeProject({ deadline: plus(30), milestones: [{ id: 'm', title: 'M', dueDate: plus(5), done: false }] })
    const tasks = [makeTask({ projectId: P, status: 'done', timeLog: [{ date: TODAY, minutes: 10 }] }), makeTask({ id: 'b', projectId: P, dueDate: plus(-1) })]
    const s = projectSummary(project, tasks, TODAY)
    expect(s.progress).toEqual(projectProgress(project, tasks))
    expect(s.health).toEqual(projectHealth(project, tasks, TODAY))
    expect(s.time).toEqual(projectTime(project, tasks, TODAY))
    expect(s.nextMilestone?.id).toBe('m')
    expect(s.tasks).toMatchObject({ total: 2, overdue: 1 })
  })
})
