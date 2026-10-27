// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_PREFIX } from '@/lib/config'
import { isoDay } from '@/lib/date'
import { makeProject, makeTask } from '@/lib/testing'
import { useProjectStore, useTaskStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { Task } from '@/types/domain'
import { TaskWorkspace } from './TaskWorkspace'

const seed: Task[] = [
  makeTask({ id: 'TSK-1', title: 'Rancang alur', status: 'doing', order: 1000, subtasks: [{ id: 'a', title: 'x', done: true }, { id: 'b', title: 'y', done: false }], estimateMinutes: 90, projectId: 'prj-1' }),
  makeTask({ id: 'TSK-2', title: 'Telat kirim', status: 'todo', order: 2000, dueDate: isoDay(-3) }),
  makeTask({ id: 'TSK-3', title: 'Pertama di kolom', status: 'todo', order: 500 }),
  makeTask({ id: 'TSK-4', title: 'Sudah beres', status: 'done', order: 1000, completedAt: isoDay(-1) }),
  makeTask({ id: 'TSK-5', title: 'Beres juga', status: 'done', order: 2000, completedAt: isoDay(-1) }),
  makeTask({ id: 'TSK-6', title: 'Lama sekali', status: 'done', order: 3000, archivedAt: '2026-01-01T00:00:00.000Z' }),
]

async function mount(path = '/tasks') {
  localStorage.setItem(STORAGE_PREFIX + 'tasks', JSON.stringify(seed))
  localStorage.setItem(STORAGE_PREFIX + 'projects', JSON.stringify([makeProject({ id: 'prj-1', name: 'Situs desa' })]))
  await Promise.all([useTaskStore.getState().load(), useProjectStore.getState().load()])
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TaskWorkspace />
    </MemoryRouter>,
  )
}
const stored = (id: string) => useTaskStore.getState().items.find((t) => t.id === id) as Task
const column = (name: string) => screen.getByRole('region', { name })
const titlesIn = (el: HTMLElement) => within(el).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }))
  localStorage.clear()
  useUiStore.setState({ toast: null })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('TaskWorkspace kanban', () => {
  it('orders each column by hand and hides archived tasks', async () => {
    await mount()
    expect(titlesIn(column('Belum mulai'))).toEqual(['Pertama di kolom', 'Telat kirim'])
    expect(screen.queryByText('Lama sekali')).toBeNull()
  })

  it('shows subtask progress and the estimate on the card that has them, and nowhere else', async () => {
    await mount()
    const doing = column('Dikerjakan')
    expect(doing.textContent).toContain('1/2')
    expect(doing.textContent).toContain('1 j 30 m')
    expect(column('Belum mulai').textContent).not.toMatch(/\d\/\d/)
  })

  it('has no sort control on the board but has one in the table', async () => {
    await mount()
    expect(screen.queryByRole('button', { name: /Urutkan/ })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Tabel' }))
    expect(screen.getByRole('button', { name: /Urutkan/ })).toBeTruthy()
  })

  it('adds a task from the bottom of a column without opening the dialog', async () => {
    await mount()
    fireEvent.click(screen.getByRole('button', { name: 'Tambah task ke kolom Dikerjakan' }))
    const input = screen.getByLabelText(/Judul task baru/)
    fireEvent.change(input, { target: { value: 'Cepat ditambah' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(within(column('Dikerjakan')).getByText('Cepat ditambah')).toBeTruthy())
    expect(titlesIn(column('Dikerjakan')).at(-1)).toBe('Cepat ditambah')
    expect(screen.queryByRole('dialog', { name: 'Task baru' })).toBeNull()
  })

  it('archives the finished ones from the Done column, with an undo, and lists them under Arsip', async () => {
    await mount()
    fireEvent.click(within(column('Selesai')).getByRole('button', { name: /Arsipkan selesai/ }))
    await waitFor(() => expect(stored('TSK-4').archivedAt).toBeTruthy())
    expect(stored('TSK-5').archivedAt).toBeTruthy()
    expect(screen.queryByText('Sudah beres', { selector: 'h3' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Arsipkan selesai/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /^Arsip/ }))
    expect(screen.getByText('Sudah beres')).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: /Pulihkan/ })[0])
    await waitFor(() => expect(Object.values(useTaskStore.getState().items).filter((t) => t.archivedAt)).toHaveLength(2))
  })

  it('opens the detail panel from a card', async () => {
    await mount()
    fireEvent.click(within(column('Dikerjakan')).getByText('Rancang alur'))
    const panel = await screen.findByRole('dialog', { name: 'Task TSK-1' })
    expect((within(panel).getByLabelText('Judul') as HTMLInputElement).value).toBe('Rancang alur')
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Task TSK-1' })).toBeNull())
  })
})

describe('smart views', () => {
  it('filters to the chosen view, combines with search, and turns off on a second press', async () => {
    await mount()
    const overdue = screen.getByRole('button', { name: /^Terlambat/ })
    fireEvent.click(overdue)
    expect(overdue.getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByText('Rancang alur')).toBeNull()
    expect(within(column('Belum mulai')).getByText('Telat kirim')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Cari task'), { target: { value: 'tidak ada' } })
    expect(screen.getByText('Tidak ada task yang cocok')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Cari task'), { target: { value: '' } })

    fireEvent.click(overdue)
    expect(screen.getByText('Rancang alur')).toBeTruthy()
  })

  it('keeps the chosen view when the filter popover is reset', async () => {
    await mount()
    fireEvent.click(screen.getByRole('button', { name: /^Tanpa project/ }))
    fireEvent.click(screen.getByRole('button', { name: /Filter/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Atur ulang filter' }))
    expect(screen.getByRole('button', { name: /^Tanpa project/ }).getAttribute('aria-pressed')).toBe('true')
  })
})

describe('table view', () => {
  const toTable = () => fireEvent.click(screen.getByRole('tab', { name: 'Tabel' }))

  it('groups rows, collapses a group, and announces bulk selection', async () => {
    await mount()
    toTable()
    fireEvent.click(screen.getByRole('button', { name: /Kelompokkan/ }))
    fireEvent.click(screen.getByRole('radio', { name: 'Status' }))
    const todo = screen.getByRole('button', { name: /Belum mulai/ })
    fireEvent.click(todo)
    expect(screen.queryByText('Telat kirim')).toBeNull()

    fireEvent.click(screen.getByLabelText('Pilih Rancang alur'))
    expect(screen.getByRole('status').textContent).toBe('1 task dipilih.')
  })

  it('bulk: sets status, archives with undo, and deletes with undo', async () => {
    await mount()
    toTable()
    fireEvent.click(screen.getByLabelText('Pilih Telat kirim'))
    fireEvent.click(screen.getByLabelText('Pilih Pertama di kolom'))
    fireEvent.change(screen.getByLabelText('Ubah status'), { target: { value: 'review' } })
    await waitFor(() => expect(stored('TSK-2').status).toBe('review'))
    expect(stored('TSK-3').status).toBe('review')

    fireEvent.click(screen.getByRole('button', { name: 'Arsipkan' }))
    await waitFor(() => expect(stored('TSK-2').archivedAt).toBeTruthy())
    await waitFor(() => expect(screen.queryByRole('toolbar')).toBeNull())
    expect(useUiStore.getState().toast?.message).toBe('2 task diarsipkan.')

    fireEvent.click(screen.getByLabelText('Pilih Rancang alur'))
    fireEvent.click(screen.getByRole('button', { name: 'Hapus' }))
    await waitFor(() => expect(useTaskStore.getState().items.some((t) => t.id === 'TSK-1')).toBe(false))
    expect(useUiStore.getState().toast?.message).toBe('Task dihapus.')
    useUiStore.getState().toast?.action?.run()
    await waitFor(() => expect(useTaskStore.getState().items.some((t) => t.id === 'TSK-1')).toBe(true))
  })

  it('drops a selection when its view changes away from the table', async () => {
    await mount()
    toTable()
    fireEvent.click(screen.getByLabelText('Pilih Telat kirim'))
    fireEvent.click(screen.getByRole('tab', { name: 'Kanban' }))
    toTable()
    expect(screen.queryByRole('toolbar')).toBeNull()
  })
})
