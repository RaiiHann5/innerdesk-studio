// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_PREFIX } from '@/lib/config'
import { makeProject, makeTask } from '@/lib/testing'
import { useProjectStore, useTaskStore } from '@/stores/entities'
import type { Task } from '@/types/domain'
import { TaskWorkspace } from './TaskWorkspace'

async function mount(tasks: Task[], path = '/tasks', projectId?: string) {
  localStorage.setItem(STORAGE_PREFIX + 'tasks', JSON.stringify(tasks))
  localStorage.setItem(STORAGE_PREFIX + 'projects', JSON.stringify([makeProject({ id: 'prj-1' })]))
  await Promise.all([useTaskStore.getState().load(), useProjectStore.getState().load()])
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TaskWorkspace projectId={projectId} />
    </MemoryRouter>,
  )
}
const archived = (id: string) => makeTask({ id, title: `Lama ${id}`, status: 'done', archivedAt: '2026-01-01T00:00:00.000Z' })

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }))
  localStorage.clear()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('task workspace empty states', () => {
  it.each(['kanban', 'table', 'timeline', 'calendar'])('says there are no tasks yet in the %s view, with a way to add one', async (view) => {
    await mount([], view === 'kanban' ? '/tasks' : `/tasks?view=${view}`)
    expect(screen.getByText('Belum ada task')).toBeTruthy()
    expect(within(screen.getByRole('tabpanel')).getByRole('button', { name: 'Task baru' })).toBeTruthy()
  })

  it('inside a project it asks for the first task of that project', async () => {
    await mount([makeTask({ id: 'x', projectId: 'other' })], '/projects/prj-1?tab=task', 'prj-1')
    expect(screen.getByText('Tambahkan task pertama untuk project ini.')).toBeTruthy()
  })

  it.each(['table', 'timeline', 'calendar'])('says everything is archived in the %s view, and still lists the archive', async (view) => {
    await mount([archived('a'), archived('b')], `/tasks?view=${view}`)
    expect(screen.getByText('Semua task diarsipkan')).toBeTruthy()
    if (view === 'table') expect(screen.getByRole('button', { name: /^Arsip/ }).textContent).toContain('2')
  })

  it('keeps the board itself when everything is archived, so a task can still be added to a column', async () => {
    await mount([archived('a')])
    expect(screen.getAllByText('Belum ada task').length).toBe(4)
    expect(screen.getByRole('button', { name: /^Arsip/ })).toBeTruthy()
  })

  it.each(['kanban', 'table', 'timeline', 'calendar'])('says nothing matches in the %s view, and the reset brings the tasks back', async (view) => {
    await mount([makeTask({ id: 'a', title: 'Rancang alur' })], view === 'kanban' ? '/tasks' : `/tasks?view=${view}`)
    fireEvent.change(screen.getByLabelText('Cari task'), { target: { value: 'tidak ada' } })
    expect(screen.getByText('Tidak ada task yang cocok')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Atur ulang filter' }))
    expect(screen.queryByText('Tidak ada task yang cocok')).toBeNull()
  })
})
