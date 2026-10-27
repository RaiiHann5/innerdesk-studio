// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isoDay } from '@/lib/date'
import { makeProject, makeTask } from '@/lib/testing'
import { useNoteStore, useProjectStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import ProjectDetailPage from './ProjectDetailPage'
import { makeNote, projectById, seed, stubBrowser } from './testSetup'

const project = makeProject({
  id: 'p1',
  name: 'Situs kecamatan',
  phase: 'desain',
  goal: 'Warga mengurus surat dari rumah',
  deadline: isoDay(30),
  milestones: [
    { id: 'm1', title: 'Prototipe', done: true, dueDate: isoDay(-5) },
    { id: 'm2', title: 'Uji coba', done: false, dueDate: isoDay(7) },
    { id: 'm3', title: 'Rilis', done: false },
  ],
  links: [
    { id: 'l1', title: 'Dasbor', url: 'https://app.example.com/admin', kind: 'akun' },
    { id: 'l2', title: 'Berkas', url: 'https://docs.example.com/a', kind: 'dokumen' },
    { id: 'l3', title: 'Rusak', url: 'javascript:alert(1)', kind: 'lainnya' },
  ],
})
const tasks = [makeTask({ id: 'T1', projectId: 'p1', title: 'Rancang form', status: 'done' }), makeTask({ id: 'T2', projectId: 'p1', title: 'Bangun API' }), makeTask({ id: 'T3', title: 'Task lain' })]
const notes = [makeNote({ id: 'n1', title: 'Rapat kickoff', projectId: 'p1' }), makeNote({ id: 'n2', title: 'Catatan lain' })]

function Where() {
  const loc = useLocation()
  return <p data-testid="where">{loc.pathname + loc.search}</p>
}
async function mount(search = '') {
  await seed({ projects: [project], tasks, notes })
  return render(
    <MemoryRouter initialEntries={[`/projects/p1${search}`]}>
      <Routes>
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/notes/:noteId" element={<p>editor catatan</p>} />
      </Routes>
      <Where />
    </MemoryRouter>,
  )
}
const tab = (name: RegExp | string) => screen.getByRole('tab', { name })
// The Task tab nests the workspace's own tabpanel inside this one, so take the outer (first) one.
const panel = () => screen.getAllByRole('tabpanel')[0]
const toast = () => useUiStore.getState().toast

beforeEach(() => {
  stubBrowser()
  useUiStore.setState({ toast: null })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('tabs', () => {
  it('has four tabs with counts, opens on Ringkasan, and keeps the choice in the URL', async () => {
    await mount()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Ringkasan', 'Task2', 'Catatan1', 'Tautan3'])
    expect(tab('Ringkasan').getAttribute('aria-selected')).toBe('true')
    fireEvent.click(tab(/Catatan/))
    expect(screen.getByTestId('where').textContent).toBe('/projects/p1?tab=catatan')
    fireEvent.click(tab('Ringkasan'))
    expect(screen.getByTestId('where').textContent).toBe('/projects/p1')
  })

  it('the Task tab is the existing workspace, scoped to the project, and keeps its own view in the URL', async () => {
    await mount('?tab=task')
    expect(within(panel()).getByText('Rancang form')).toBeTruthy()
    expect(within(panel()).queryByText('Task lain')).toBeNull()
    fireEvent.click(within(panel()).getByRole('tab', { name: 'Tabel' }))
    expect(screen.getByTestId('where').textContent).toBe('/projects/p1?tab=task&view=table')
    fireEvent.click(tab('Ringkasan'))
    expect(screen.getByTestId('where').textContent).toBe('/projects/p1')
  })

  it('the stats row inside the Task tab shows the project progress, milestones included', async () => {
    await mount('?tab=task')
    // 1 of 2 tasks done and 1 of 3 milestones done: 2 of 5.
    expect(within(screen.getByLabelText('Ringkasan project')).getByText('Selesai').parentElement?.textContent).toContain('40%')
  })
})

describe('Ringkasan', () => {
  it('shows the goal, the numbers, the phase and the next milestone', async () => {
    await mount()
    expect(within(panel()).getByText('Warga mengurus surat dari rumah')).toBeTruthy()
    expect(within(panel()).getByText('Progres').parentElement?.textContent).toContain('40%')
    expect(within(panel()).getByText(/Milestone berikutnya: Uji coba/)).toBeTruthy()
    const current = within(panel()).getByText('Desain').closest('li') as HTMLElement
    expect(current.getAttribute('aria-current')).toBe('step')
  })

  it('moves to the next phase with an undo, and the button goes away at the last phase', async () => {
    await mount()
    fireEvent.click(screen.getByRole('button', { name: /Lanjut ke fase berikutnya/ }))
    await waitFor(() => expect(projectById('p1').phase).toBe('pengembangan'))
    expect(toast()?.message).toBe('Project masuk fase pengembangan.')
    act(() => toast()?.action?.run())
    await waitFor(() => expect(projectById('p1').phase).toBe('desain'))
    await act(async () => {
      await useProjectStore.getState().update('p1', { phase: 'peluncuran' })
    })
    expect(screen.queryByRole('button', { name: /Lanjut ke fase berikutnya/ })).toBeNull()
    expect(screen.getByText('Fase terakhir')).toBeTruthy()
  })

  it('milestones: add, check, date, reorder, remove', async () => {
    await mount()
    const input = screen.getByLabelText('Tambah milestone')
    fireEvent.change(input, { target: { value: 'Pelatihan petugas' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(projectById('p1').milestones.map((m) => m.title)).toEqual(['Prototipe', 'Uji coba', 'Rilis', 'Pelatihan petugas']))

    fireEvent.click(screen.getByLabelText('Selesai: Uji coba'))
    await waitFor(() => expect(projectById('p1').milestones[1].done).toBe(true))
    expect(within(panel()).getByText(/Milestone berikutnya: Rilis/)).toBeTruthy()

    fireEvent.click(screen.getAllByRole('button', { name: 'Atur tanggal' })[0])
    const date = screen.getByLabelText('Tanggal: Rilis')
    fireEvent.change(date, { target: { value: '2026-12-01' } })
    fireEvent.blur(date)
    await waitFor(() => expect(projectById('p1').milestones[2].dueDate).toBe('2026-12-01'))

    fireEvent.click(screen.getByRole('button', { name: 'Aksi milestone Rilis' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Naikkan' }))
    await waitFor(() => expect(projectById('p1').milestones.map((m) => m.title).slice(0, 3)).toEqual(['Prototipe', 'Rilis', 'Uji coba']))

    fireEvent.click(screen.getByRole('button', { name: 'Aksi milestone Pelatihan petugas' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Hapus' }))
    await waitFor(() => expect(projectById('p1').milestones).toHaveLength(3))
  })

  it('an open milestone past its date reads as late, in text', async () => {
    await mount()
    await act(async () => {
      await useProjectStore.getState().update('p1', { milestones: [{ id: 'x', title: 'Telat', done: false, dueDate: isoDay(-3) }] })
    })
    expect(within(panel()).getByRole('button', { name: /^Terlambat, .*ubah tanggal Telat$/ })).toBeTruthy()
  })

  it('a milestone that fails to save offers a retry that saves it', async () => {
    await mount()
    const real = useProjectStore.getState().update
    useProjectStore.setState({ update: () => Promise.reject(new Error('putus')) })
    fireEvent.click(screen.getByLabelText('Selesai: Rilis'))
    await waitFor(() => expect(toast()?.action?.label).toBe('Coba lagi'))
    expect(toast()?.message).toBe('Milestone belum bisa disimpan.')
    useProjectStore.setState({ update: real })
    act(() => toast()?.action?.run())
    await waitFor(() => expect(projectById('p1').milestones[2].done).toBe(true))
  })

  it('a blank milestone title is refused and the old one stays on screen', async () => {
    await mount()
    const field = screen.getByLabelText('Judul milestone: Uji coba') as HTMLInputElement
    fireEvent.change(field, { target: { value: '  ' } })
    fireEvent.blur(field)
    expect(field.value).toBe('Uji coba')
    expect(projectById('p1').milestones[1].title).toBe('Uji coba')
  })
})

describe('Catatan', () => {
  it('lists only this project\'s notes with the usual cards', async () => {
    await mount('?tab=catatan')
    expect(within(panel()).getByText('Rapat kickoff')).toBeTruthy()
    expect(within(panel()).queryByText('Catatan lain')).toBeNull()
  })

  it('"Catatan baru" creates a note already tied to the project and opens it', async () => {
    await mount('?tab=catatan')
    fireEvent.click(screen.getByRole('button', { name: /Catatan baru/ }))
    await screen.findByText('editor catatan')
    const created = useNoteStore.getState().items.find((n) => n.id !== 'n1' && n.id !== 'n2')
    expect(created?.projectId).toBe('p1')
  })

  it('shows an empty state with the same action when there are no notes', async () => {
    await seed({ projects: [project], tasks, notes: [] })
    render(
      <MemoryRouter initialEntries={['/projects/p1?tab=catatan']}>
        <Routes>
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText('Belum ada catatan untuk project ini')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /Catatan baru/ })).toHaveLength(1)
  })
})

describe('Tautan', () => {
  const open = () => fireEvent.click(screen.getAllByRole('button', { name: /Tambah tautan/ })[0])
  const fill = (url: string, title = '', kind = '') => {
    fireEvent.change(screen.getByLabelText('Alamat'), { target: { value: url } })
    if (title) fireEvent.change(screen.getByLabelText('Judul'), { target: { value: title } })
    if (kind) fireEvent.change(screen.getByLabelText('Jenis'), { target: { value: kind } })
  }

  it('groups by kind, opens in a new tab safely, and never makes a link of a bad stored address', async () => {
    await mount('?tab=tautan')
    expect(within(panel()).getAllByRole('heading', { level: 3 }).map((h) => h.textContent?.replace(/\s+\d+$/, ''))).toEqual(['Akun', 'Dokumen', 'Lainnya'])
    const link = within(panel()).getByRole('link', { name: /Dasbor/ })
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    expect(link.getAttribute('href')).toBe('https://app.example.com/admin')
    expect(within(panel()).queryByRole('link', { name: /Rusak/ })).toBeNull()
    expect(within(panel()).getByText('Alamat tidak valid')).toBeTruthy()
  })

  it('refuses credentials and secrets, with a reason, and stores nothing', async () => {
    await mount('?tab=tautan')
    open()
    fill('https://admin:rahasia@situs.com/login', 'Login')
    fireEvent.click(screen.getByRole('button', { name: 'Tambahkan' }))
    expect(screen.getByRole('alert').textContent).toMatch(/nama pengguna atau kata sandi/)
    fill('https://situs.com/x?password=abc')
    fireEvent.click(screen.getByRole('button', { name: 'Tambahkan' }))
    expect(screen.getByRole('alert').textContent).toMatch(/kata sandi atau token/)
    fill('javascript:alert(1)')
    fireEvent.click(screen.getByRole('button', { name: 'Tambahkan' }))
    expect(screen.getByRole('alert').textContent).toMatch(/http atau https|tidak valid/)
    expect(projectById('p1').links).toHaveLength(3)
  })

  it('adds a link, normalising a bare address to https', async () => {
    await mount('?tab=tautan')
    open()
    fill('figma.com/file/abc', 'Desain halaman utama', 'desain')
    fireEvent.click(screen.getByRole('button', { name: 'Tambahkan' }))
    await waitFor(() => expect(projectById('p1').links).toHaveLength(4))
    expect(projectById('p1').links[3]).toMatchObject({ title: 'Desain halaman utama', url: 'https://figma.com/file/abc', kind: 'desain' })
    expect(within(panel()).getAllByRole('heading', { level: 3 }).map((h) => h.textContent?.replace(/\s+\d+$/, ''))).toContain('Desain')
  })

  it('edits a link in place and validates the change', async () => {
    await mount('?tab=tautan')
    fireEvent.click(screen.getByRole('button', { name: 'Aksi tautan Berkas' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Ubah' }))
    fill('https://x.com/?token=1')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(screen.getByRole('alert')).toBeTruthy()
    fill('https://docs.example.com/b', 'Berkas baru')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(projectById('p1').links.find((l) => l.id === 'l2')).toMatchObject({ title: 'Berkas baru', url: 'https://docs.example.com/b' }))
  })

  it('deletes with an undo that puts the link back', async () => {
    await mount('?tab=tautan')
    fireEvent.click(screen.getByRole('button', { name: 'Aksi tautan Berkas' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Hapus' }))
    await waitFor(() => expect(projectById('p1').links.map((l) => l.id)).toEqual(['l1', 'l3']))
    act(() => toast()?.action?.run())
    await waitFor(() => expect(projectById('p1').links).toHaveLength(3))
  })

  it('copies the address', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    await mount('?tab=tautan')
    fireEvent.click(screen.getByRole('button', { name: 'Salin tautan Dasbor' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://app.example.com/admin'))
    expect(toast()?.message).toBe('Tautan disalin.')
  })

  it('shows an empty state with a way to add the first link', async () => {
    await seed({ projects: [{ ...project, links: [] }], tasks, notes })
    render(
      <MemoryRouter initialEntries={['/projects/p1?tab=tautan']}>
        <Routes>
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText('Belum ada tautan')).toBeTruthy()
  })
})

describe('archived project', () => {
  it('tells you, and can be restored from its page', async () => {
    await seed({ projects: [{ ...project, archivedAt: '2026-09-01T00:00:00.000Z' }], tasks, notes })
    render(
      <MemoryRouter initialEntries={['/projects/p1']}>
        <Routes>
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText(/Project ini diarsipkan/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Pulihkan/ }))
    await waitFor(() => expect(projectById('p1').archivedAt).toBeUndefined())
  })
})
