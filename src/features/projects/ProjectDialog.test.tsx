// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeProject, makeTask } from '@/lib/testing'
import { useProjectStore, useTaskStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { Project } from '@/types/domain'
import { ProjectDialog } from './ProjectDialog'
import { projectById, seed, stubBrowser } from './testSetup'

const base = makeProject({
  id: 'p1',
  name: 'Situs',
  color: 'slate',
  milestones: [{ id: 'm1', title: 'Rilis', done: true, dueDate: '2026-10-01' }],
})
const onClose = vi.fn()
const onSaved = vi.fn()
const toast = () => useUiStore.getState().toast

// `null` means create mode; a default parameter would swallow `undefined`.
async function mount(project: Project | null = base, tasks = [makeTask({ id: 'T1', projectId: 'p1', title: 'Rancang', status: 'doing', dueDate: '2026-10-05' })]) {
  await seed({ projects: project ? [project] : [], tasks })
  const editing = project ?? undefined
  return render(
    <MemoryRouter initialEntries={['/projects']}>
      <Routes>
        <Route path="/projects" element={<ProjectDialog open project={editing} onClose={onClose} onSaved={onSaved} />} />
        <Route path="/projects/:id" element={<p>halaman salinan</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  stubBrowser()
  onClose.mockClear()
  onSaved.mockClear()
  useUiStore.setState({ toast: null })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ProjectDialog fields', () => {
  it('saves the colour, start date and goal along with the rest', async () => {
    await mount()
    fireEvent.click(screen.getByRole('radio', { name: 'Teal' }))
    fireEvent.change(screen.getByLabelText('Tanggal mulai'), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText('Tenggat'), { target: { value: '2026-12-01' } })
    fireEvent.change(screen.getByLabelText('Tujuan'), { target: { value: '  Warga mengurus surat dari rumah ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan perubahan' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(projectById('p1')).toMatchObject({ color: 'teal', startDate: '2026-09-01', deadline: '2026-12-01', goal: 'Warga mengurus surat dari rumah' })
    expect(projectById('p1').milestones).toHaveLength(1)
  })

  it('marks the chosen colour and offers six', async () => {
    await mount()
    const group = screen.getByRole('radiogroup', { name: 'Warna project' })
    expect(within(group).getAllByRole('radio')).toHaveLength(6)
    expect(within(group).getByRole('radio', { name: 'Batu tulis' }).getAttribute('aria-checked')).toBe('true')
  })

  it('refuses a start date after the deadline, and a blank name', async () => {
    await mount()
    fireEvent.change(screen.getByLabelText('Tanggal mulai'), { target: { value: '2026-12-31' } })
    fireEvent.change(screen.getByLabelText('Tenggat'), { target: { value: '2026-12-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan perubahan' }))
    expect(screen.getByRole('alert').textContent).toMatch(/Tanggal mulai tidak boleh setelah tenggat/)
    fireEvent.change(screen.getByLabelText('Nama'), { target: { value: ' ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan perubahan' }))
    expect(screen.getByRole('alert').textContent).toMatch(/Nama project wajib/)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('creates a project with a colour and no archive or duplicate actions', async () => {
    await mount(null)
    expect(screen.queryByRole('button', { name: 'Duplikat' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Arsipkan' })).toBeNull()
    fireEvent.change(screen.getByLabelText('Nama'), { target: { value: 'Proyek baru' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Kayu mawar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Buat project' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(onSaved.mock.calls[0][0]).toMatchObject({ name: 'Proyek baru', color: 'rosewood', milestones: [], links: [] })
  })
})

describe('Arsipkan', () => {
  it('asks first, and does nothing if cancelled', async () => {
    await mount()
    fireEvent.click(screen.getByRole('button', { name: 'Arsipkan' }))
    const confirm = screen.getByRole('dialog', { name: 'Arsipkan project' })
    expect(confirm.textContent).toContain('Arsipkan project ini?')
    fireEvent.click(within(confirm).getByRole('button', { name: 'Batal' }))
    expect(projectById('p1').archivedAt).toBeUndefined()
  })

  it('archives once confirmed, closes, and offers an undo', async () => {
    await mount()
    fireEvent.click(screen.getByRole('button', { name: 'Arsipkan' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Arsipkan project' })).getByRole('button', { name: 'Arsipkan' }))
    await waitFor(() => expect(projectById('p1').archivedAt).toBeTruthy())
    expect(onClose).toHaveBeenCalled()
    act(() => toast()?.action?.run())
    await waitFor(() => expect(projectById('p1').archivedAt).toBeUndefined())
  })
})

describe('Duplikat', () => {
  it('explains what is copied, then copies tasks as todo without dates and milestones unchecked', async () => {
    await mount()
    fireEvent.click(screen.getByRole('button', { name: 'Duplikat' }))
    const confirm = screen.getByRole('dialog', { name: 'Duplikat project' })
    expect(confirm.textContent).toMatch(/belum mulai tanpa tenggat/)
    expect(confirm.textContent).toMatch(/milestone tanpa centang/)
    fireEvent.click(within(confirm).getByRole('button', { name: 'Duplikat' }))

    await screen.findByText('halaman salinan')
    const copy = useProjectStore.getState().items.find((p) => p.id !== 'p1') as Project
    expect(copy.name).toBe('Situs (salinan)')
    expect(copy.milestones.map((m) => [m.title, m.done, m.dueDate])).toEqual([['Rilis', false, undefined]])
    const copied = useTaskStore.getState().items.filter((t) => t.projectId === copy.id)
    expect(copied.map((t) => [t.title, t.status, t.dueDate])).toEqual([['Rancang', 'todo', undefined]])
    expect(useTaskStore.getState().items.find((t) => t.id === 'T1')).toMatchObject({ status: 'doing', dueDate: '2026-10-05' })
    expect(toast()?.message).toBe('Project diduplikasi.')

    act(() => toast()?.action?.run())
    await waitFor(() => expect(useProjectStore.getState().items.map((p) => p.id)).toEqual(['p1']))
    await waitFor(() => expect(useTaskStore.getState().items.map((t) => t.id)).toEqual(['T1']))
  })
})
