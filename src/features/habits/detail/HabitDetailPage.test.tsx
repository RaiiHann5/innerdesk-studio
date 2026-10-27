// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_PREFIX } from '@/lib/config'
import { fmt, isoDay } from '@/lib/date'
import { ALL_WEEKDAYS } from '@/lib/habits'
import { useHabitLogStore, useHabitStore, useMoodStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { Habit, HabitLog, MoodEntry } from '@/types/domain'
import { stubBrowser } from '../../projects/testSetup'
import HabitDetailPage from './HabitDetailPage'

const TODAY = isoDay(0)
// A day before today that is in the same month, so its cell is on screen. On the 1st there is none, so today stands in.
const PAST = TODAY.slice(8) === '01' ? TODAY : isoDay(-1)

const makeHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  name: 'Baca buku',
  color: 'ochre',
  icon: 'book',
  days: ALL_WEEKDAYS,
  target: 1,
  startDate: isoDay(-40),
  order: 1000,
  ...overrides,
})
const makeLog = (date: string, value = 1, note?: string, habitId = 'h1'): HabitLog => ({ id: `${habitId}-${date}`, createdAt: '', updatedAt: '', habitId, date, value, ...(note ? { note } : {}) })

async function mount(habits: Habit[], logs: HabitLog[] = [], moods: MoodEntry[] = [], initial = '/habits/h1') {
  localStorage.setItem(STORAGE_PREFIX + 'habits', JSON.stringify(habits))
  localStorage.setItem(STORAGE_PREFIX + 'habit-logs', JSON.stringify(logs))
  localStorage.setItem(STORAGE_PREFIX + 'mood-v2', JSON.stringify(moods))
  await Promise.all([useHabitStore.getState().load(), useHabitLogStore.getState().load(), useMoodStore.getState().load()])
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/habits" element={<p>daftar kebiasaan</p>} />
        <Route path="/habits/:habitId" element={<HabitDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const storedLogs = () => JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'habit-logs') ?? '[]') as HabitLog[]
const logFor = (date: string) => storedLogs().find((l) => l.date === date)
const dayButton = (date: string) => screen.getByRole('button', { name: new RegExp(`^${fmt(date, 'EEEE d MMMM')}:`) })

beforeEach(() => {
  stubBrowser()
  useUiStore.setState({ toast: null })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('summary', () => {
  it('shows the habit, its streak and what has been done in total', async () => {
    await mount([makeHabit()], [makeLog(isoDay(-3)), makeLog(isoDay(-2)), makeLog(isoDay(-1))])
    expect(await screen.findByRole('heading', { name: 'Baca buku' })).toBeTruthy()
    const stats = screen.getByText('Streak sekarang').closest('dl')!
    expect(stats.textContent).toContain('3')
    expect(within(stats).getByText('Total selesai').parentElement!.textContent).toContain('3')
    expect(screen.getByText(/hari ke-/).textContent).toContain('41')
  })

  it('adds up the amount for a counted habit', async () => {
    await mount([makeHabit({ target: 10, unit: 'halaman' })], [makeLog(isoDay(-2), 10), makeLog(isoDay(-1), 4)])
    expect(await screen.findByText('14 halaman seluruhnya')).toBeTruthy()
  })

  it('lets today be ticked from the header', async () => {
    await mount([makeHabit()])
    fireEvent.click(await screen.findByRole('button', { name: 'Selesaikan Baca buku' }))
    await waitFor(() => expect(logFor(TODAY)?.value).toBe(1))
  })

  it('says so when the habit does not exist', async () => {
    await mount([makeHabit()], [], [], '/habits/hilang')
    expect(await screen.findByText('Kebiasaan tidak ditemukan')).toBeTruthy()
  })

  it('opens an archived habit without offering a check for today', async () => {
    await mount([makeHabit({ archivedAt: '2026-10-01T00:00:00.000Z' })])
    expect(await screen.findByText(/diarsipkan/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Selesaikan Baca buku' })).toBeNull()
  })
})

describe('calendar', () => {
  it('opens a day and fills it in', async () => {
    await mount([makeHabit()])
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${fmt(PAST, 'EEEE d MMMM')}:`) }))
    const dialog = await screen.findByRole('dialog', { name: 'Catatan Baca buku' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Selesaikan Baca buku' }))
    await waitFor(() => expect(logFor(PAST)?.value).toBe(1))
  })

  it('marks days that have a journal entry', async () => {
    await mount([makeHabit()], [makeLog(PAST, 1, 'Seru')])
    await screen.findByRole('heading', { name: 'Baca buku' })
    expect(dayButton(PAST).getAttribute('aria-label')).toContain('ada catatan')
  })

  it('does not open days that have not happened', async () => {
    await mount([makeHabit()])
    await screen.findByRole('heading', { name: 'Baca buku' })
    const next = screen.getByRole('button', { name: 'Bulan berikutnya' }) as HTMLButtonElement
    expect(next.disabled).toBe(true) // already on the current month
  })

  it('steps back a month and stops at the month the habit started', async () => {
    await mount([makeHabit({ startDate: isoDay(-40) })])
    const back = (await screen.findByRole('button', { name: 'Bulan sebelumnya' })) as HTMLButtonElement
    fireEvent.click(back)
    fireEvent.click(back)
    fireEvent.click(back)
    expect(back.disabled).toBe(true)
  })
})

describe('journal', () => {
  it('lists entries newest first, with how the day went', async () => {
    await mount([makeHabit()], [makeLog(isoDay(-5), 1, 'Lama'), makeLog(isoDay(-2), 0, 'Baru: ketiduran')], [], '/habits/h1?tab=jurnal')
    const list = await screen.findByRole('list')
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toContain('Baru: ketiduran')
    expect(items[0].textContent).toContain('Terlewat')
    expect(items[1].textContent).toContain('Lama')
    expect(items[1].textContent).toContain('Selesai')
  })

  it('shows the mood of the day beside an entry', async () => {
    const mood: MoodEntry = { id: 'm1', createdAt: '', updatedAt: '', date: isoDay(-2), level: 4, factors: [] }
    await mount([makeHabit()], [makeLog(isoDay(-2), 1, 'Lancar')], [mood], '/habits/h1?tab=jurnal')
    expect((await screen.findByRole('listitem')).textContent).toContain('Baik')
  })

  it('invites the first entry when there are none', async () => {
    await mount([makeHabit()], [], [], '/habits/h1?tab=jurnal')
    expect(await screen.findByText('Belum ada catatan')).toBeTruthy()
  })

  it('writes an entry for a day that was skipped, without ticking it', async () => {
    await mount([makeHabit()], [], [], '/habits/h1?tab=jurnal')
    fireEvent.click(await screen.findByRole('button', { name: /Tulis catatan/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Catatan Baca buku' })
    fireEvent.change(within(dialog).getByLabelText('Tanggal'), { target: { value: isoDay(-3) } })
    fireEvent.change(within(dialog).getByLabelText('Catatan'), { target: { value: 'Terlalu capek.' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Simpan catatan' }))
    await waitFor(() => expect(logFor(isoDay(-3))).toMatchObject({ value: 0, note: 'Terlalu capek.' }))
    expect(useUiStore.getState().toast?.message).toBe('Catatan disimpan')
    expect(await screen.findByText('Terlalu capek.')).toBeTruthy()
  })

  it('only allows saving once something changed, and fills the box from a prompt', async () => {
    await mount([makeHabit()], [], [], '/habits/h1?tab=jurnal')
    fireEvent.click(await screen.findByRole('button', { name: /Tulis catatan/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Catatan Baca buku' })
    const save = within(dialog).getByRole('button', { name: 'Simpan catatan' }) as HTMLButtonElement
    expect(save.disabled).toBe(true)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Yang menghalangi' }))
    expect((within(dialog).getByLabelText('Catatan') as HTMLTextAreaElement).value).toBe('Yang menghalangi: ')
    expect(save.disabled).toBe(false)
  })

  it('edits an entry in place', async () => {
    await mount([makeHabit()], [makeLog(isoDay(-2), 1, 'Awal')], [], '/habits/h1?tab=jurnal')
    fireEvent.click(await screen.findByRole('button', { name: /Ubah catatan/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Catatan Baca buku' })
    fireEvent.change(within(dialog).getByLabelText('Catatan'), { target: { value: 'Diubah' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Simpan catatan' }))
    await waitFor(() => expect(logFor(isoDay(-2))?.note).toBe('Diubah'))
    expect(storedLogs()).toHaveLength(1)
    expect(logFor(isoDay(-2))?.value).toBe(1)
  })
})

describe('keeping the journal and the ticks apart', () => {
  it('keeps the entry when a ticked day is unticked', async () => {
    await mount([makeHabit()], [makeLog(PAST, 1, 'Tetap ada')])
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${fmt(PAST, 'EEEE d MMMM')}:`) }))
    fireEvent.click(await screen.findByRole('button', { name: 'Batalkan Baca buku' }))
    await waitFor(() => expect(logFor(PAST)?.value).toBe(0))
    expect(logFor(PAST)?.note).toBe('Tetap ada')
  })

  it('keeps the tick when only the entry is deleted', async () => {
    await mount([makeHabit()], [makeLog(PAST, 1, 'Hapus ini')])
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${fmt(PAST, 'EEEE d MMMM')}:`) }))
    fireEvent.click(await screen.findByRole('button', { name: 'Hapus catatan' }))
    await waitFor(() => expect(logFor(PAST)?.note).toBeUndefined())
    expect(logFor(PAST)?.value).toBe(1)
  })

  it('leaves no empty row behind when the entry of an unticked day is deleted', async () => {
    await mount([makeHabit()], [makeLog(PAST, 0, 'Hanya catatan')])
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${fmt(PAST, 'EEEE d MMMM')}:`) }))
    fireEvent.click(await screen.findByRole('button', { name: 'Hapus catatan' }))
    await waitFor(() => expect(storedLogs()).toEqual([]))
  })

  it('keeps the entry when a count goes back down to zero', async () => {
    await mount([makeHabit({ target: 4 })], [makeLog(PAST, 1, 'Sedikit')])
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${fmt(PAST, 'EEEE d MMMM')}:`) }))
    const dialog = await screen.findByRole('dialog', { name: 'Catatan Baca buku' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Kurangi Baca buku' }))
    await waitFor(() => expect(logFor(PAST)?.value).toBe(0))
    expect(logFor(PAST)?.note).toBe('Sedikit')
  })

  it('does not count a day with only an entry as done, in the streak or the total', async () => {
    await mount([makeHabit()], [makeLog(isoDay(-1), 0, 'Skip'), makeLog(isoDay(-2))])
    const stats = (await screen.findByText('Streak sekarang')).closest('dl')!
    expect(within(stats).getByText('Total selesai').parentElement!.textContent).toContain('1')
    expect(within(stats).getByText('Streak sekarang').parentElement!.textContent).toMatch(/0\s*hari/)
  })
})

describe('menu', () => {
  it('deletes the habit with its journal and returns to the list', async () => {
    await mount([makeHabit()], [makeLog(PAST, 1, 'Catatan')])
    fireEvent.click(await screen.findByRole('button', { name: 'Menu untuk Baca buku' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Hapus' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Hapus' }))
    await screen.findByText('daftar kebiasaan')
    expect(storedLogs()).toEqual([])
    expect(useHabitStore.getState().items).toEqual([])
  })

  it('archives from here and then offers to restore', async () => {
    await mount([makeHabit()])
    fireEvent.click(await screen.findByRole('button', { name: 'Menu untuk Baca buku' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Arsipkan' }))
    await waitFor(() => expect(useHabitStore.getState().items[0].archivedAt).toBeTruthy())
    fireEvent.click(await screen.findByRole('button', { name: 'Menu untuk Baca buku' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Pulihkan' }))
    await waitFor(() => expect(useHabitStore.getState().items[0].archivedAt).toBeUndefined())
  })
})
