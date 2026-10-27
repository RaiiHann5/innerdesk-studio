// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isoDay } from '@/lib/date'
import { makeProject, makeTask } from '@/lib/testing'
import { useProjectStore } from '@/stores/entities'
import ProjectsPage from './ProjectsPage'
import { seed, stubBrowser } from './testSetup'

const projects = [
  makeProject({ id: 'a', name: 'Alfa situs', phase: 'riset', color: 'teal', deadline: isoDay(40) }),
  makeProject({ id: 'b', name: 'Beta toko', phase: 'desain', deadline: isoDay(10), description: 'Penjualan batik' }),
  makeProject({ id: 'c', name: 'Cakra blog', phase: 'riset', status: 'paused' }),
  makeProject({ id: 'z', name: 'Zeta lama', archivedAt: '2026-09-01T00:00:00.000Z' }),
]
const tasks = [makeTask({ id: 'T1', projectId: 'b', status: 'done' }), makeTask({ id: 'T2', projectId: 'b', dueDate: isoDay(-2) })]

async function mount(path = '/projects') {
  await seed({ projects, tasks })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ProjectsPage />
    </MemoryRouter>,
  )
}
const board = () => screen.getByRole('tabpanel')

beforeEach(stubBrowser)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ProjectsPage', () => {
  it('shows the board by phase with active projects only, and an Arsip count', async () => {
    await mount()
    expect(within(screen.getByRole('region', { name: 'Fase riset' })).getByText('Alfa situs')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Fase desain' })).getByText('Beta toko')).toBeTruthy()
    expect(screen.queryByText('Zeta lama')).toBeNull()
    expect(screen.getByRole('tab', { name: /Arsip/ }).textContent).toContain('1')
  })

  it('keeps the search and status filters working in every view', async () => {
    await mount()
    fireEvent.change(screen.getByPlaceholderText('Cari project'), { target: { value: 'batik' } })
    expect(screen.queryByText('Alfa situs')).toBeNull()
    expect(screen.getByText('Beta toko')).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText('Cari project'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Dijeda' }))
    expect(screen.queryByText('Alfa situs')).toBeNull()
    expect(screen.getByText('Cakra blog')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Daftar' }))
    expect(within(board()).getAllByRole('row')).toHaveLength(2)
    fireEvent.change(screen.getByPlaceholderText('Cari project'), { target: { value: 'zzz' } })
    expect(screen.getByText('Tidak ada project yang cocok')).toBeTruthy()
  })

  it('the list shows progress, health, deadline and phase, and starts sorted by deadline', async () => {
    await mount('/projects?view=daftar')
    const rows = within(board()).getAllByRole('row').slice(1)
    expect(rows.map((r) => within(r).getAllByRole('cell')[0].textContent)).toEqual([expect.stringContaining('Beta toko'), expect.stringContaining('Alfa situs'), expect.stringContaining('Cakra blog')])
    const beta = rows[0].textContent as string
    expect(beta).toContain('50%')
    expect(beta).toContain('Desain')
    expect(beta).toContain('Perlu perhatian')
    expect(rows[2].textContent).toContain('Tanpa tenggat')
  })

  it('sorts when a header is pressed, and flips on a second press', async () => {
    await mount('/projects?view=daftar')
    const header = () => screen.getByRole('columnheader', { name: /^Project/ })
    const names = () => within(board()).getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0].textContent?.slice(0, 4))
    fireEvent.click(within(header()).getByRole('button'))
    expect(header().getAttribute('aria-sort')).toBe('ascending')
    expect(names()).toEqual(['Alfa', 'Beta', 'Cakr'])
    fireEvent.click(within(header()).getByRole('button'))
    expect(header().getAttribute('aria-sort')).toBe('descending')
    expect(names()).toEqual(['Cakr', 'Beta', 'Alfa'])
    expect(screen.getByRole('columnheader', { name: /^Tenggat/ }).getAttribute('aria-sort')).toBe('none')
  })

  it('lists archived projects under Arsip and restores one', async () => {
    await mount('/projects?view=arsip')
    expect(within(board()).getByText('Zeta lama')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Pulihkan/ }))
    await waitFor(() => expect(useProjectStore.getState().items.find((p) => p.id === 'z')?.archivedAt).toBeUndefined())
    expect(screen.getByText('Arsip masih kosong')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Papan' }))
    expect(screen.getByText('Zeta lama')).toBeTruthy()
  })

  it('the stats row counts active projects only', async () => {
    await mount()
    const active = screen.getByText('Project aktif').parentElement as HTMLElement
    expect(active.textContent).toContain('2')
  })
})
