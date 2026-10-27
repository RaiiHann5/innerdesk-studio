// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_PREFIX } from '@/lib/config'
import { isoDay } from '@/lib/date'
import { makeProject, makeTask } from '@/lib/testing'
import { useFocusStore } from '@/features/focus/store/focusStore'
import { useProjectStore, useTaskStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { Task } from '@/types/domain'
import { TaskPanel } from './TaskPanel'

const onClose = vi.fn()

function Live({ id }: { id: string }) {
  const task = useTaskStore((s) => s.items.find((t) => t.id === id))
  const projects = useProjectStore((s) => s.items)
  return task ? <TaskPanel key={task.id} task={task} projects={projects} onClose={onClose} /> : <p>ditutup</p>
}

async function mount(task: Partial<Task> = {}, extra: Task[] = []) {
  localStorage.setItem(STORAGE_PREFIX + 'tasks', JSON.stringify([makeTask({ id: 'TSK-1', title: 'Judul awal', ...task }), ...extra]))
  localStorage.setItem(STORAGE_PREFIX + 'projects', JSON.stringify([makeProject({ id: 'prj-1', name: 'Situs desa' })]))
  await Promise.all([useTaskStore.getState().load(), useProjectStore.getState().load()])
  return render(
    <MemoryRouter initialEntries={['/tasks']}>
      <Routes>
        <Route path="/tasks" element={<Live id="TSK-1" />} />
        <Route path="/focus" element={<p>halaman fokus</p>} />
      </Routes>
    </MemoryRouter>,
  )
}
const stored = () => useTaskStore.getState().items.find((t) => t.id === 'TSK-1') as Task
const toast = () => useUiStore.getState().toast

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }))
  localStorage.clear()
  onClose.mockClear()
  useUiStore.setState({ toast: null })
  useFocusStore.setState({ running: false, started: false, mode: 'focus', taskId: undefined, projectId: undefined })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('TaskPanel autosave', () => {
  it('saves a typed title after a pause and reports it', async () => {
    await mount()
    fireEvent.change(screen.getByLabelText('Judul'), { target: { value: 'Judul baru' } })
    expect(stored().title).toBe('Judul awal')
    await waitFor(() => expect(stored().title).toBe('Judul baru'), { timeout: 2500 })
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Tersimpan/))
  })

  it('merges edits made close together into one write', async () => {
    await mount()
    fireEvent.change(screen.getByLabelText('Judul'), { target: { value: 'Judul B' } })
    fireEvent.change(screen.getByLabelText('Tag'), { target: { value: 'a, b, a' } })
    await waitFor(() => expect(stored().tags).toEqual(['a', 'b']), { timeout: 2500 })
    expect(stored().title).toBe('Judul B')
  })

  it('writes a deliberate choice at once', async () => {
    await mount()
    fireEvent.change(screen.getByLabelText('Prioritas'), { target: { value: 'urgent' } })
    await waitFor(() => expect(stored().priority).toBe('urgent'))
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'prj-1' } })
    await waitFor(() => expect(stored().projectId).toBe('prj-1'))
  })

  it('saves what is pending when the panel closes', async () => {
    const view = await mount()
    fireEvent.change(screen.getByLabelText('Deskripsi'), { target: { value: 'Ditulis cepat' } })
    view.unmount()
    await waitFor(() => expect(stored().description).toBe('Ditulis cepat'))
  })

  it('does not save a blank title, shows why, and restores the last one on blur', async () => {
    await mount()
    const title = screen.getByLabelText('Judul') as HTMLInputElement
    fireEvent.change(title, { target: { value: '   ' } })
    expect(screen.getByRole('alert').textContent).toMatch(/wajib diisi/)
    fireEvent.blur(title)
    expect(title.value).toBe('Judul awal')
    expect(stored().title).toBe('Judul awal')
  })

  it('clearing the due date clears the time with it', async () => {
    await mount({ dueDate: '2026-10-20', dueTime: '09:00' })
    fireEvent.change(screen.getByLabelText('Tenggat'), { target: { value: '' } })
    await waitFor(() => expect(stored().dueDate).toBeUndefined())
    expect(stored().dueTime).toBeUndefined()
  })

  it('rejects an estimate that is not whole minutes and does not save it', async () => {
    await mount({ estimateMinutes: 60 })
    fireEvent.change(screen.getByLabelText('Estimasi (menit)'), { target: { value: '1.5' } })
    expect(screen.getByText(/bilangan bulat menit/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Estimasi (menit)'), { target: { value: '' } })
    await waitFor(() => expect(stored().estimateMinutes).toBeUndefined(), { timeout: 2500 })
  })

  it('offers a retry when a save fails, and keeps the change', async () => {
    await mount()
    const real = useTaskStore.getState().update
    useTaskStore.setState({ update: () => Promise.reject(new Error('putus')) })
    fireEvent.change(screen.getByLabelText('Judul'), { target: { value: 'Gagal dulu' } })
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Gagal menyimpan/), { timeout: 2500 })
    useTaskStore.setState({ update: real })
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }))
    await waitFor(() => expect(stored().title).toBe('Gagal dulu'))
  })
})

describe('TaskPanel subtasks', () => {
  it('adds, checks, reorders and deletes, saving each change', async () => {
    await mount({ subtasks: [{ id: 'a', title: 'Pertama', done: false }] })
    const add = screen.getByLabelText('Tambah subtask')
    fireEvent.change(add, { target: { value: 'Kedua' } })
    fireEvent.keyDown(add, { key: 'Enter' })
    await waitFor(() => expect(stored().subtasks.map((s) => s.title)).toEqual(['Pertama', 'Kedua']))

    fireEvent.click(screen.getByLabelText('Selesai: Kedua'))
    await waitFor(() => expect(stored().subtasks[1].done).toBe(true))
    expect(screen.getByText('1 dari 2 selesai')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Aksi subtask Kedua' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Naikkan' }))
    await waitFor(() => expect(stored().subtasks.map((s) => s.title)).toEqual(['Kedua', 'Pertama']))

    fireEvent.click(screen.getByRole('button', { name: 'Aksi subtask Pertama' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Hapus' }))
    await waitFor(() => expect(stored().subtasks.map((s) => s.title)).toEqual(['Kedua']))
  })
})

describe('TaskPanel status and recurrence', () => {
  it('finishing a recurring task creates the next one and tells the date', async () => {
    await mount({ dueDate: isoDay(0), recurrence: { freq: 'weekly', interval: 1 } })
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'done' } })
    await waitFor(() => expect(useTaskStore.getState().items).toHaveLength(2))
    expect(stored().status).toBe('done')
    const next = useTaskStore.getState().items.find((t) => t.id !== 'TSK-1') as Task
    expect(next).toMatchObject({ status: 'todo', dueDate: isoDay(7) })
    expect(toast()?.message).toMatch(/dijadwalkan lagi/)
  })

  it('sets a recurrence rule from the field', async () => {
    await mount()
    fireEvent.change(screen.getByLabelText('Pengulangan'), { target: { value: 'monthly' } })
    await waitFor(() => expect(stored().recurrence).toEqual({ freq: 'monthly', interval: 1 }))
    fireEvent.change(screen.getByLabelText('Selang pengulangan'), { target: { value: '3' } })
    await waitFor(() => expect(stored().recurrence).toEqual({ freq: 'monthly', interval: 3 }))
    fireEvent.change(screen.getByLabelText('Pengulangan'), { target: { value: '' } })
    await waitFor(() => expect(stored().recurrence).toBeUndefined())
  })
})

describe('TaskPanel time and focus', () => {
  it('shows tracked time against the estimate and the latest sessions', async () => {
    await mount({ estimateMinutes: 240, timeLog: [{ date: '2026-10-05', minutes: 50 }, { date: '2026-10-07', minutes: 70 }], focusCount: 3 })
    const section = screen.getByRole('region', { name: 'Waktu dan fokus' })
    expect(section.textContent).toContain('2 j')
    expect(section.textContent).toContain('dari estimasi 4 j')
    expect(section.textContent).toContain('3 blok fokus selesai')
    expect(screen.getByRole('progressbar', { name: 'Waktu terpakai dari estimasi' }).getAttribute('aria-valuenow')).toBe('50')
    const rows = screen.getByRole('list', { name: 'Sesi terbaru' }).querySelectorAll('li')
    expect(rows[0].textContent).toContain('1 j 10 m')
  })

  it('Mulai fokus selects this task for the timer and opens /focus', async () => {
    await mount({ projectId: 'prj-1' })
    fireEvent.click(screen.getByRole('button', { name: /Mulai fokus/ }))
    expect(useFocusStore.getState()).toMatchObject({ taskId: 'TSK-1', projectId: 'prj-1' })
    expect(screen.getByText('halaman fokus')).toBeTruthy()
  })

  it('does not hijack a running block', async () => {
    useFocusStore.setState({ running: true, taskId: 'TSK-9' })
    await mount()
    fireEvent.click(screen.getByRole('button', { name: /Mulai fokus/ }))
    expect(useFocusStore.getState().taskId).toBe('TSK-9')
    expect(toast()?.message).toMatch(/Timer fokus sedang berjalan/)
  })

  it('offers no focus button for a finished task', async () => {
    await mount({ status: 'done' })
    expect(screen.queryByRole('button', { name: /Mulai fokus/ })).toBeNull()
  })
})

describe('TaskPanel delete and archive', () => {
  it('deletes with an undo toast and closes the panel', async () => {
    await mount({ title: 'Akan dihapus' })
    fireEvent.click(screen.getByRole('button', { name: /Hapus task/ }))
    expect(onClose).toHaveBeenCalled()
    await waitFor(() => expect(useTaskStore.getState().items).toHaveLength(0))
    expect(toast()?.message).toBe('Task dihapus.')
    act(() => toast()?.action?.run())
    await waitFor(() => expect(useTaskStore.getState().items).toHaveLength(1))
    expect(stored().title).toBe('Akan dihapus')
  })

  it('archives with undo', async () => {
    await mount()
    fireEvent.click(screen.getByRole('button', { name: 'Arsipkan' }))
    await waitFor(() => expect(stored().archivedAt).toBeTruthy())
    expect(onClose).toHaveBeenCalled()
    act(() => toast()?.action?.run())
    await waitFor(() => expect(stored().archivedAt).toBeUndefined())
  })

  it('an archived task can be restored from its panel', async () => {
    await mount({ archivedAt: '2026-10-01T00:00:00.000Z' })
    expect(screen.queryByRole('button', { name: 'Arsipkan' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Pulihkan/ }))
    await waitFor(() => expect(stored().archivedAt).toBeUndefined())
  })
})
