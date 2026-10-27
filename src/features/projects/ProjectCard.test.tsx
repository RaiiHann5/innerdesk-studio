// @vitest-environment jsdom
import { cleanup, render, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { isoDay } from '@/lib/date'
import { projectSummary } from '@/lib/projectStats'
import { makeProject, makeTask } from '@/lib/testing'
import { ProjectCard } from './ProjectCard'
import { ProjectOverview } from './ProjectOverview'

afterEach(cleanup)
const renderCard = (project = makeProject(), tasks = [makeTask({ projectId: project.id })]) =>
  render(
    <MemoryRouter>
      <ProjectCard project={project} tasks={tasks} />
    </MemoryRouter>,
  )

describe('ProjectCard', () => {
  it('keeps the monogram, the name, the phase and a restrained colour dot', () => {
    const { container } = renderCard(makeProject({ name: 'Situs layanan kecamatan', color: 'teal', phase: 'desain' }))
    expect(container.textContent).toContain('SL')
    expect(container.textContent).toContain('Situs layanan kecamatan')
    expect(container.textContent).toContain('fase desain')
    expect(container.querySelectorAll('.bg-cat-teal')).toHaveLength(1)
  })

  it('says nothing about health while the project is Sehat', () => {
    const { container } = renderCard(makeProject({ deadline: isoDay(60) }), [makeTask({ projectId: 'prj-1', dueDate: isoDay(30) })])
    expect(container.textContent).not.toMatch(/Sehat|Perlu perhatian|Berisiko/)
  })

  it('shows the level and the reason in one line when it is not Sehat', () => {
    const late = [makeTask({ id: 'a', projectId: 'prj-1', dueDate: isoDay(-2) }), makeTask({ id: 'b', projectId: 'prj-1', dueDate: isoDay(-1) })]
    const { container } = renderCard(makeProject(), late)
    expect(container.textContent).toContain('Perlu perhatian: 2 task terlambat')
  })

  it('shows the next milestone instead of the deadline when there is one', () => {
    const project = makeProject({ deadline: isoDay(40), milestones: [{ id: 'm1', title: 'Prototipe', done: false, dueDate: isoDay(5) }] })
    const { container } = renderCard(project)
    expect(container.textContent).toContain('Prototipe')
    expect(container.textContent).not.toContain('Tenggat')
  })

  it('falls back to the deadline, or to "Tanpa tenggat", when no milestone is open', () => {
    expect(renderCard(makeProject({ deadline: isoDay(40) })).container.textContent).toContain('Tenggat')
    cleanup()
    expect(renderCard(makeProject()).container.textContent).toContain('Tanpa tenggat')
  })

  it('counts tasks and milestones together, and says so only when there are milestones', () => {
    const tasks = [makeTask({ id: 'a', projectId: 'prj-1', status: 'done' }), makeTask({ id: 'b', projectId: 'prj-1' })]
    expect(renderCard(makeProject(), tasks).container.textContent).toContain('1 dari 2 task')
    cleanup()
    const withMilestone = makeProject({ milestones: [{ id: 'm', title: 'M', done: true }] })
    const { container } = renderCard(withMilestone, tasks)
    expect(container.textContent).toContain('2 dari 3 task dan milestone')
    expect(container.textContent).toContain('67%')
  })
})

describe('one project, the same numbers everywhere', () => {
  const project = makeProject({
    id: 'prj-1',
    deadline: isoDay(10),
    milestones: [
      { id: 'm1', title: 'Satu', done: true },
      { id: 'm2', title: 'Dua', done: false, dueDate: isoDay(-1) },
    ],
  })
  const tasks = [
    makeTask({ id: 'a', projectId: 'prj-1', status: 'done', timeLog: [{ date: isoDay(0), minutes: 45 }] }),
    makeTask({ id: 'b', projectId: 'prj-1', dueDate: isoDay(-3) }),
    makeTask({ id: 'c', projectId: 'prj-1', status: 'done', archivedAt: '2026-01-01T00:00:00.000Z', timeLog: [{ date: '2020-01-01', minutes: 60 }] }),
  ]
  const summary = projectSummary(project, tasks)

  it('the card and the Ringkasan tab show the same progress, health and counts', () => {
    const card = renderCard(project, tasks).container
    const overview = render(
      <MemoryRouter>
        <ProjectOverview project={project} tasks={tasks} />
      </MemoryRouter>,
    ).container
    const pct = `${summary.progress.percent}%`
    expect(card.textContent).toContain(pct)
    expect(within(overview).getByText('Progres').parentElement?.textContent).toContain(pct)
    const counts = `${summary.progress.done} dari ${summary.progress.total}`
    expect(card.textContent).toContain(counts)
    expect(overview.textContent).toContain(counts)
    expect(card.textContent).toContain(summary.health.reason)
    expect(overview.textContent).toContain(summary.health.reason)
    // 45 minutes this week, 105 in total (archived work still counts as time spent).
    expect(summary.time).toEqual({ weekMinutes: 45, totalMinutes: 105 })
    expect(overview.textContent).toContain('45 m')
    expect(overview.textContent).toContain('1 j 45 m')
  })
})
