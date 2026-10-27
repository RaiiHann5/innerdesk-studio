// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { getISODay, parseISO } from 'date-fns'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_PREFIX } from '@/lib/config'
import { isoDay } from '@/lib/date'
import { ALL_WEEKDAYS } from '@/lib/habits'
import { useHabitLogStore, useHabitStore, useMoodStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { Habit, HabitLog } from '@/types/domain'
import { stubBrowser } from '../projects/testSetup'
import HabitsPage from './HabitsPage'

const TODAY = isoDay(0)

const makeHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  name: 'Minum air',
  color: 'teal',
  icon: 'drop',
  days: ALL_WEEKDAYS,
  target: 1,
  startDate: isoDay(-30),
  order: 1000,
  ...overrides,
})

const makeLog = (habitId: string, date: string, value = 1): HabitLog => ({ id: `${habitId}-${date}`, createdAt: '', updatedAt: '', habitId, date, value })

async function mount(habits: Habit[], logs: HabitLog[] = [], initial = '/habits') {
  localStorage.setItem(STORAGE_PREFIX + 'habits', JSON.stringify(habits))
  localStorage.setItem(STORAGE_PREFIX + 'habit-logs', JSON.stringify(logs))
  localStorage.setItem(STORAGE_PREFIX + 'mood-v2', JSON.stringify([]))
  await Promise.all([useHabitStore.getState().load(), useHabitLogStore.getState().load(), useMoodStore.getState().load()])
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <HabitsPage />
    </MemoryRouter>,
  )
}

const storedLogs = () => JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'habit-logs') ?? '[]') as HabitLog[]
const toast = () => useUiStore.getState().toast
const pressed = (el: HTMLElement) => el.getAttribute('aria-pressed')
const label = (el: HTMLElement) => el.getAttribute('aria-label')

beforeEach(() => {
  stubBrowser()
  useUiStore.setState({ toast: null })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('today list', () => {
  it('checks a plain habit off and takes the check back', async () => {
    await mount([makeHabit()])
    const check = await screen.findByRole('button', { name: 'Selesaikan Minum air' })
    expect(pressed(check)).toBe('false')

    fireEvent.click(check)
    const done = await screen.findByRole('button', { name: 'Batalkan Minum air' })
    expect(pressed(done)).toBe('true')
    expect(storedLogs()).toMatchObject([{ habitId: 'h1', date: TODAY, value: 1 }])
    expect(screen.getByText('dari 1 kebiasaan selesai')).toBeTruthy()

    fireEvent.click(done)
    await screen.findByRole('button', { name: 'Selesaikan Minum air' })
    expect(storedLogs()).toEqual([])
  })

  it('counts up a counted habit and finishes it at the target', async () => {
    await mount([makeHabit({ target: 8, unit: 'gelas' })])
    const status = await screen.findByRole('status', { name: 'Minum air: 0 dari 8 gelas' })

    fireEvent.click(screen.getByRole('button', { name: 'Tambah Minum air' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tambah Minum air' }))
    await waitFor(() => expect(label(status)).toBe('Minum air: 2 dari 8 gelas'))
    expect(pressed(screen.getByRole('button', { name: 'Selesaikan Minum air' }))).toBe('false')

    fireEvent.click(screen.getByRole('button', { name: 'Selesaikan Minum air' }))
    await waitFor(() => expect(label(status)).toBe('Minum air: 8 dari 8 gelas'))
    expect(storedLogs()).toHaveLength(1)
    expect(storedLogs()[0].value).toBe(8)
  })

  it('does not go below zero or leave a log of zero behind', async () => {
    await mount([makeHabit({ target: 4 })], [makeLog('h1', TODAY, 1)])
    fireEvent.click(await screen.findByRole('button', { name: 'Kurangi Minum air' }))
    await waitFor(() => expect(storedLogs()).toEqual([]))
    expect((screen.getByRole('button', { name: 'Kurangi Minum air' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('fills in an earlier day from the week strip', async () => {
    await mount([makeHabit()])
    const strip = await screen.findByRole('list', { name: 'Tujuh hari terakhir: Minum air' })
    const days = within(strip).getAllByRole('button')
    expect(days).toHaveLength(7)
    fireEvent.click(days[5]) // yesterday
    await waitFor(() => expect(storedLogs()).toMatchObject([{ habitId: 'h1', date: isoDay(-1), value: 1 }]))
    expect(pressed(days[5])).toBe('true')
  })

  it('says so, instead of offering a check, when the habit is not due today', async () => {
    const todayWeekday = getISODay(parseISO(TODAY))
    await mount([makeHabit({ days: ALL_WEEKDAYS.filter((d) => d !== todayWeekday) })])
    expect(await screen.findByText('Bukan hari ini')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Selesaikan Minum air' })).toBeNull()
    expect(screen.getByText('dari 0 kebiasaan selesai')).toBeTruthy()
    expect(screen.getByText('Tidak ada kebiasaan yang dijadwalkan hari ini.')).toBeTruthy()
  })

  it('shows the streak of consecutive days', async () => {
    await mount([makeHabit()], [makeLog('h1', isoDay(-3)), makeLog('h1', isoDay(-2)), makeLog('h1', isoDay(-1))])
    expect((await screen.findByTitle('Streak saat ini')).textContent).toContain('3 hari')
  })
})

describe('creating and editing', () => {
  it('asks for a name and at least one day', async () => {
    await mount([makeHabit()])
    fireEvent.click(await screen.findByRole('button', { name: /Kebiasaan baru/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Kebiasaan baru' })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Buat kebiasaan' }))
    expect((await within(dialog).findByRole('alert')).textContent).toBe('Nama kebiasaan wajib diisi.')

    fireEvent.change(within(dialog).getByLabelText('Nama'), { target: { value: 'Peregangan' } })
    for (const name of ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']) fireEvent.click(within(dialog).getByRole('button', { name }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Buat kebiasaan' }))
    expect((await within(dialog).findByRole('alert')).textContent).toBe('Pilih paling sedikit satu hari.')
    expect(useHabitStore.getState().items).toHaveLength(1)
  })

  it('creates a counted habit that starts today and lands at the end of the list', async () => {
    await mount([makeHabit({ order: 1000 })])
    fireEvent.click(await screen.findByRole('button', { name: /Kebiasaan baru/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Kebiasaan baru' })

    fireEvent.change(within(dialog).getByLabelText('Nama'), { target: { value: 'Baca buku' } })
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Mencapai jumlah' }))
    fireEvent.change(within(dialog).getByLabelText('Jumlah per hari'), { target: { value: '20' } })
    fireEvent.change(within(dialog).getByLabelText('Satuan'), { target: { value: 'halaman' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Buat kebiasaan' }))

    await waitFor(() => expect(useHabitStore.getState().items).toHaveLength(2))
    const created = useHabitStore.getState().items.find((h) => h.name === 'Baca buku')!
    expect(created).toMatchObject({ target: 20, unit: 'halaman', startDate: TODAY, days: ALL_WEEKDAYS })
    expect(created.order).toBeGreaterThan(1000)
    expect(toast()?.message).toBe('Kebiasaan dibuat')
  })

  it('rejects a count that is not a whole number of at least 2', async () => {
    await mount([makeHabit()])
    fireEvent.click(await screen.findByRole('button', { name: /Kebiasaan baru/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Kebiasaan baru' })
    fireEvent.change(within(dialog).getByLabelText('Nama'), { target: { value: 'X' } })
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Mencapai jumlah' }))
    fireEvent.change(within(dialog).getByLabelText('Jumlah per hari'), { target: { value: '1' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Buat kebiasaan' }))
    expect((await within(dialog).findByRole('alert')).textContent).toContain('antara 2 dan 999')
  })

  it('edits a habit and keeps its history', async () => {
    await mount([makeHabit()], [makeLog('h1', isoDay(-1))])
    fireEvent.click(await screen.findByRole('button', { name: 'Menu untuk Minum air' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Ubah' }))
    const dialog = await screen.findByRole('dialog', { name: 'Ubah kebiasaan' })
    fireEvent.change(within(dialog).getByLabelText('Nama'), { target: { value: 'Minum air putih' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Simpan perubahan' }))
    await waitFor(() => expect(useHabitStore.getState().items[0].name).toBe('Minum air putih'))
    expect(storedLogs()).toHaveLength(1)
  })
})

describe('reminder time', () => {
  it('saves the time with a new habit and shows it on the row', async () => {
    await mount([makeHabit()])
    fireEvent.click(await screen.findByRole('button', { name: /Kebiasaan baru/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Kebiasaan baru' })
    fireEvent.change(within(dialog).getByLabelText('Nama'), { target: { value: 'Peregangan' } })
    fireEvent.change(within(dialog).getByLabelText('Pengingat'), { target: { value: '07:30' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Buat kebiasaan' }))
    await waitFor(() => expect(useHabitStore.getState().items.find((h) => h.name === 'Peregangan')?.reminderTime).toBe('07:30'))
    expect(await screen.findByText(/pengingat 07\.30/)).toBeTruthy()
  })

  it('leaves it unset by default, and clears it when asked', async () => {
    await mount([makeHabit({ reminderTime: '20:00' })])
    fireEvent.click(await screen.findByRole('button', { name: 'Menu untuk Minum air' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Ubah' }))
    const dialog = await screen.findByRole('dialog', { name: 'Ubah kebiasaan' })
    expect((within(dialog).getByLabelText('Pengingat') as HTMLInputElement).value).toBe('20:00')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hapus' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Simpan perubahan' }))
    await waitFor(() => expect(useHabitStore.getState().items[0].reminderTime).toBeUndefined())
    expect(storedHabitsHaveNoReminder()).toBe(true)
  })
})

const storedHabitsHaveNoReminder = () => (JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'habits') ?? '[]') as Habit[]).every((h) => !h.reminderTime)

describe('archive and delete', () => {
  it('archives a habit out of the list and brings it back from the archive tab', async () => {
    await mount([makeHabit()], [makeLog('h1', isoDay(-1))])
    fireEvent.click(await screen.findByRole('button', { name: 'Menu untuk Minum air' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Arsipkan' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Selesaikan Minum air' })).toBeNull())
    expect(toast()?.message).toBe('Kebiasaan diarsipkan.')
    expect(storedLogs()).toHaveLength(1) // history stays

    fireEvent.click(screen.getByRole('tab', { name: /Arsip/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Pulihkan' }))
    await waitFor(() => expect(useHabitStore.getState().items[0].archivedAt).toBeUndefined())
  })

  it('deletes a habit with its logs and undo restores both', async () => {
    await mount([makeHabit(), makeHabit({ id: 'h2', name: 'Baca', order: 2000 })], [makeLog('h1', isoDay(-1)), makeLog('h1', isoDay(-2)), makeLog('h2', isoDay(-1))])
    fireEvent.click(await screen.findByRole('button', { name: 'Menu untuk Minum air' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Hapus' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Hapus' }))

    await waitFor(() => expect(useHabitStore.getState().items.map((h) => h.id)).toEqual(['h2']))
    expect(storedLogs().map((l) => l.habitId)).toEqual(['h2'])

    toast()!.action!.run()
    await waitFor(() => expect(useHabitStore.getState().items).toHaveLength(2))
    await waitFor(() => expect(storedLogs()).toHaveLength(3))
    expect(useHabitLogStore.getState().items).toHaveLength(3)
  })
})

describe('empty and stats', () => {
  it('offers starting points when there are no habits, and a pressed one fills the form', async () => {
    await mount([])
    fireEvent.click(await screen.findByRole('button', { name: /Minum air putih/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Kebiasaan baru' })
    expect((within(dialog).getByLabelText('Nama') as HTMLInputElement).value).toBe('Minum air putih')
    expect((within(dialog).getByLabelText('Jumlah per hari') as HTMLInputElement).value).toBe('8')
    expect((within(dialog).getByLabelText('Satuan') as HTMLInputElement).value).toBe('gelas')
  })

  it('opens on the statistics tab from the address and reports each habit', async () => {
    await mount([makeHabit()], [makeLog('h1', isoDay(-1)), makeLog('h1', isoDay(-2))], '/habits?tab=statistik')
    expect(await screen.findByRole('img', { name: /Riwayat 12 minggu terakhir untuk Minum air/ })).toBeTruthy()
    expect(screen.getByText('Terpanjang')).toBeTruthy()
  })
})
