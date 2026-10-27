// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_PREFIX } from '@/lib/config'
import { makeProject } from '@/lib/testing'
import { stubBrowser } from '@/features/projects/testSetup'
import { useNoteStore, useProjectStore, useTaskStore } from '@/stores/entities'
import type { BrainstormSession } from '@/types/domain'
import BrainstormPage from './BrainstormPage'
import { useBrainstormStore } from './store/brainstormStore'

const inbox: BrainstormSession = { id: 'inbox', title: 'Inbox Ide', inbox: true, ideas: [], clusters: [], createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' }
const topic: BrainstormSession = {
  id: 'bsm-2',
  title: 'Fitur berikutnya',
  question: 'Apa yang paling membantu?',
  projectId: 'p1',
  ideas: [
    { id: 'i1', text: 'Statistik mingguan', starred: true, createdAt: '2026-10-02T00:00:00.000Z' },
    { id: 'i2', text: 'Mode gelap otomatis', starred: false, createdAt: '2026-10-02T00:01:00.000Z' },
  ],
  clusters: [],
  createdAt: '2026-10-02T00:00:00.000Z',
  updatedAt: '2026-10-05T00:00:00.000Z',
}

async function mount(sessions: BrainstormSession[], path = '/brainstorm') {
  localStorage.setItem(STORAGE_PREFIX + 'brainstorm', JSON.stringify(sessions))
  localStorage.setItem(STORAGE_PREFIX + 'tasks', '[]')
  localStorage.setItem(STORAGE_PREFIX + 'notes-v2', '[]')
  localStorage.setItem(STORAGE_PREFIX + 'projects', JSON.stringify([makeProject({ id: 'p1', name: 'Innerdesk' })]))
  useBrainstormStore.setState({ items: [], status: 'idle', error: null })
  await Promise.all([useTaskStore.getState().load(), useNoteStore.getState().load(), useProjectStore.getState().load()])
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BrainstormPage />
    </MemoryRouter>,
  )
}

beforeEach(stubBrowser)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('BrainstormPage', () => {
  it('opens on the inbox, with the sessions listed and an empty state', async () => {
    await mount([topic, inbox])
    expect(await screen.findByRole('heading', { name: 'Inbox Ide', level: 2 })).toBeTruthy()
    const rail = screen.getByRole('navigation', { name: 'Daftar sesi brainstorm' })
    expect(within(rail).getAllByRole('button', { name: /ide|Inbox|Fitur/ }).length).toBeGreaterThan(1)
    expect(screen.getByText('Belum ada ide', { selector: 'p.font-medium' })).toBeTruthy()
  })

  it('adds an idea with Enter, clears the field, and lists it', async () => {
    await mount([inbox])
    const input = (await screen.findByLabelText('Tulis satu ide')) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Widget cuaca di dashboard' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    await waitFor(() => expect(screen.getByText('Widget cuaca di dashboard')).toBeTruthy())
    expect(input.value).toBe('')
    expect(screen.getByRole('status').textContent).toBe('1 ide')
  })

  it('does not add a blank idea', async () => {
    await mount([inbox])
    const input = (await screen.findByLabelText('Tulis satu ide')) as HTMLInputElement
    fireEvent.change(input, { target: { value: '   ' } })
    expect((screen.getByRole('button', { name: 'Tambah' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    expect(screen.getByRole('status').textContent).toBe('Belum ada ide')
  })

  it('opens the session named in the address, on the stage named in the address', async () => {
    await mount([inbox, topic], '/brainstorm?sesi=bsm-2&tahap=kelompokkan')
    expect(await screen.findByDisplayValue('Fitur berikutnya')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Belum dikelompokkan' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Kelompokkan' }).getAttribute('aria-checked')).toBe('true')
  })

  it('makes a cluster, and refuses the same name twice', async () => {
    await mount([inbox, topic], '/brainstorm?sesi=bsm-2&tahap=kelompokkan')
    const input = (await screen.findByLabelText('Nama kelompok baru')) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Analitik' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    await waitFor(() => expect(screen.getByRole('region', { name: 'Analitik' })).toBeTruthy())
    fireEvent.change(input, { target: { value: 'analitik' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    expect(screen.getAllByRole('region', { name: 'Analitik' })).toHaveLength(1)
  })

  it('moves an idea into a cluster from its menu, without dragging', async () => {
    await mount([inbox, { ...topic, clusters: [{ id: 'grp-1', name: 'Analitik', color: 'teal' }] }], '/brainstorm?sesi=bsm-2&tahap=kelompokkan')
    fireEvent.click(await screen.findByRole('button', { name: 'Aksi untuk ide: Statistik mingguan' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Pindah ke Analitik' }))
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Analitik' })).getByText('Statistik mingguan')).toBeTruthy())
    expect(within(screen.getByRole('region', { name: 'Belum dikelompokkan' })).queryByText('Statistik mingguan')).toBeNull()
  })

  it('turns an idea into a task, then shows it under Diproses with a link', async () => {
    await mount([inbox, topic], '/brainstorm?sesi=bsm-2&tahap=aksi')
    expect(await screen.findByText('Task dan catatan dari ide ini masuk ke project Innerdesk.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Jadikan task: Statistik mingguan' }))
    await waitFor(() => expect(useTaskStore.getState().items).toHaveLength(1))
    expect(useTaskStore.getState().items[0]).toMatchObject({ title: 'Statistik mingguan', projectId: 'p1' })
    // It leaves the waiting list at once and shows under Diproses with a link to where it went.
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Jadikan task: Statistik mingguan' })).toBeNull())
    fireEvent.click(screen.getByRole('radio', { name: /Diproses/ }))
    expect(await screen.findByRole('link', { name: /Buka task/ })).toBeTruthy()
  })

  it('opens the Pilih stage from the address', async () => {
    await mount([inbox, topic], '/brainstorm?sesi=bsm-2&tahap=pilih')
    expect(await screen.findByRole('region', { name: 'Quick win' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Pilih' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByText('0 dari 2 ide sudah dinilai')).toBeTruthy()
  })

  it('switches to Pilih with the 3 key and to Aksi with the 4 key', async () => {
    // Starts on Kelompokkan: the Tangkap stage focuses its input, and hotkeys are ignored while typing.
    await mount([inbox, topic], '/brainstorm?sesi=bsm-2&tahap=kelompokkan')
    await screen.findByRole('region', { name: 'Belum dikelompokkan' })
    fireEvent.keyDown(document.body, { key: '3' })
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Pilih' }).getAttribute('aria-checked')).toBe('true'))
    fireEvent.keyDown(document.body, { key: '4' })
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Aksi' }).getAttribute('aria-checked')).toBe('true'))
  })

  it('moves an idea from Belum dinilai into Quick win once both scores are set, with no dragging', async () => {
    await mount([inbox, topic], '/brainstorm?sesi=bsm-2&tahap=pilih')
    const impact = await screen.findByRole('group', { name: 'Dampak ide: Mode gelap otomatis' })
    fireEvent.click(within(impact).getByRole('button', { name: 'Tinggi' }))
    // One score is not enough: it stays in the tray.
    await waitFor(() => expect(within(screen.getByRole('group', { name: 'Dampak ide: Mode gelap otomatis' })).getByRole('button', { name: 'Tinggi' }).getAttribute('aria-pressed')).toBe('true'))
    expect(within(screen.getByRole('region', { name: 'Belum dinilai' })).getByText('Mode gelap otomatis')).toBeTruthy()

    fireEvent.click(within(screen.getByRole('group', { name: 'Usaha ide: Mode gelap otomatis' })).getByRole('button', { name: 'Ringan' }))
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Quick win' })).getByText('Mode gelap otomatis')).toBeTruthy())
    expect(within(screen.getByRole('region', { name: 'Belum dinilai' })).queryByText('Mode gelap otomatis')).toBeNull()
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Ide "Mode gelap otomatis" masuk ke Quick win.'))
    expect(screen.getByText('1 dari 2 ide sudah dinilai')).toBeTruthy()
    expect(useBrainstormStore.getState().items.find((s) => s.id === 'bsm-2')?.ideas[1]).toMatchObject({ impact: 3, effort: 1 })
  })

  it('clears a score when the same one is pressed again, and sends the idea back to the tray', async () => {
    const rated: BrainstormSession = { ...topic, ideas: [{ ...topic.ideas[0], impact: 3, effort: 3 }, topic.ideas[1]] }
    await mount([inbox, rated], '/brainstorm?sesi=bsm-2&tahap=pilih')
    expect(within(await screen.findByRole('region', { name: 'Proyek besar' })).getByText('Statistik mingguan')).toBeTruthy()
    fireEvent.click(within(screen.getByRole('group', { name: 'Usaha ide: Statistik mingguan' })).getByRole('button', { name: 'Berat' }))
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Belum dinilai' })).getByText('Statistik mingguan')).toBeTruthy())
    expect(useBrainstormStore.getState().items.find((s) => s.id === 'bsm-2')?.ideas[0].effort).toBeUndefined()
  })

  it('keeps focus on the score that was pressed after the idea moves', async () => {
    const half: BrainstormSession = { ...topic, ideas: [{ ...topic.ideas[0], impact: 3 }, topic.ideas[1]] }
    await mount([inbox, half], '/brainstorm?sesi=bsm-2&tahap=pilih')
    const group = await screen.findByRole('group', { name: 'Usaha ide: Statistik mingguan' })
    fireEvent.click(within(group).getByRole('button', { name: 'Ringan' }))
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Quick win' })).getByText('Statistik mingguan')).toBeTruthy())
    await waitFor(() => {
      const again = within(screen.getByRole('group', { name: 'Usaha ide: Statistik mingguan' })).getByRole('button', { name: 'Ringan' })
      expect(document.activeElement).toBe(again)
    })
  })

  it('leaves out an idea that already became a task, and says so', async () => {
    const done: BrainstormSession = { ...topic, ideas: [{ ...topic.ideas[0], convertedTo: { kind: 'task', id: 'TSK-1' } }, topic.ideas[1]] }
    await mount([inbox, done], '/brainstorm?sesi=bsm-2&tahap=pilih')
    // The idea points at a task that does not exist, so it counts as not processed yet and is still listed.
    expect(await screen.findByText('Statistik mingguan')).toBeTruthy()
    // Once the task exists, the idea is done and leaves the board. Only `id` matters to the check.
    act(() => useTaskStore.setState({ items: [{ id: 'TSK-1' }] as never }))
    await waitFor(() => expect(screen.queryByText('Statistik mingguan')).toBeNull())
    expect(screen.getByText('Mode gelap otomatis')).toBeTruthy()
    expect(screen.getByText(/1 ide yang sudah diproses tidak ditampilkan/)).toBeTruthy()
  })

  it('shows an empty state when the session has no ideas', async () => {
    await mount([inbox], '/brainstorm?tahap=pilih')
    expect(await screen.findByText('Belum ada ide untuk dinilai')).toBeTruthy()
  })

  it('starts the archived view empty and says so', async () => {
    await mount([inbox])
    fireEvent.click(await screen.findByRole('radio', { name: 'Arsip' }))
    expect(await screen.findByText('Tidak ada sesi di arsip')).toBeTruthy()
  })

  it('creates a session from the dialog and opens it', async () => {
    await mount([inbox])
    fireEvent.click(await screen.findByRole('button', { name: 'Sesi baru' }))
    fireEvent.change(screen.getByLabelText('Judul'), { target: { value: 'Nama produk' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buat sesi' }))
    expect(await screen.findByDisplayValue('Nama produk')).toBeTruthy()
    expect(useBrainstormStore.getState().items.map((s) => s.title)).toContain('Nama produk')
  })
})
