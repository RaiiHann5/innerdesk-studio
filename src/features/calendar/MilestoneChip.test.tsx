// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeProject } from '@/lib/testing'
import { projectById, seed, stubBrowser } from '@/features/projects/testSetup'
import { MilestoneChip } from './MilestoneChip'

const project = makeProject({ id: 'p1', name: 'Situs desa', color: 'teal', milestones: [{ id: 'm1', title: 'Prototipe', done: false, dueDate: '2026-10-20' }] })

beforeEach(stubBrowser)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('MilestoneChip', () => {
  it('is a checkbox that names the milestone and its project, in the project colour', async () => {
    await seed({ projects: [project] })
    const { container } = render(<MilestoneChip item={{ milestone: project.milestones[0], project }} />)
    const chip = screen.getByRole('checkbox', { name: /Milestone Situs desa: Prototipe/ })
    expect(chip.getAttribute('aria-checked')).toBe('false')
    expect(container.querySelector('.bg-cat-teal')).toBeTruthy()
  })

  it('ticks the milestone off in its project, and a second click undoes it', async () => {
    await seed({ projects: [project] })
    render(<MilestoneChip item={{ milestone: project.milestones[0], project }} />)
    fireEvent.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(projectById('p1').milestones[0].done).toBe(true))
    fireEvent.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(projectById('p1').milestones[0].done).toBe(false))
  })

  it('shows a finished milestone struck through', () => {
    const done = { ...project.milestones[0], done: true }
    const { container } = render(<MilestoneChip item={{ milestone: done, project }} />)
    expect(container.querySelector('.line-through')?.textContent).toBe('Prototipe')
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true')
  })
})
