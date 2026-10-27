// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isoDay } from '@/lib/date'
import { useUiStore } from '@/stores/ui'
import type { LibraryItem } from '@/types/domain'
import { stubBrowser } from '../projects/testSetup'
import LibraryPage from './LibraryPage'
import { makeBook, makeItem, renderAt, seedLibrary, stored } from './testkit'

const here = () => screen.getByTestId('here').textContent
// The titles on the shelf itself. The "Sedang berlangsung" rail repeats some of them, so it is left out.
const shelfHeadings = () => screen.getAllByRole('heading', { level: 3 }).filter((h) => !h.closest('section'))
const cards = () => shelfHeadings().map((h) => h.textContent)

const SHELF: LibraryItem[] = [
  makeItem({ id: 'f1', title: 'Oppenheimer', rating: 9, genres: ['Drama', 'Sejarah'], finishedAt: '2026-03-01' }),
  makeItem({ id: 'f2', title: 'Past Lives', rating: 8, genres: ['Drama'], finishedAt: '2026-02-01' }),
  makeItem({ id: 'f3', title: 'The Zone of Interest', status: 'planned', genres: ['Sejarah'], year: 2023 }),
  makeBook({ id: 'b1', title: 'Bumi Manusia', status: 'active' }),
  makeBook({ id: 'b2', title: 'Sapiens', status: 'done', rating: 7, finishedAt: isoDay(-5), authors: ['Yuval Noah Harari'], genres: ['Nonfiksi'] }),
]

const mount = async (items: LibraryItem[] = SHELF, initial = '/library') => {
  await seedLibrary({ items })
  return renderAt(initial, <LibraryPage />, '/library')
}

beforeEach(() => {
  stubBrowser()
  useUiStore.setState({ toast: null })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('the shelf', () => {
  it('shows every film and book, with counts on the tabs', async () => {
    await mount()
    await screen.findAllByRole('heading', { level: 3 })
    expect(shelfHeadings()).toHaveLength(5)
    expect(screen.getByRole('tab', { name: /Semua/ }).textContent).toContain('5')
    expect(screen.getByRole('tab', { name: /Film/ }).textContent).toContain('3')
    expect(screen.getByRole('tab', { name: /Buku/ }).textContent).toContain('2')
  })

  it('narrows to one kind from the tab, and keeps that in the address', async () => {
    await mount()
    fireEvent.click(await screen.findByRole('tab', { name: /Buku/ }))
    await waitFor(() => expect(cards().sort()).toEqual(['Bumi Manusia', 'Sapiens']))
    expect(here()).toContain('tab=buku')
  })

  it('opens from an address that already holds filters', async () => {
    await mount(SHELF, '/library?tab=film&status=done&urut=judul')
    await screen.findByRole('heading', { level: 3, name: 'Oppenheimer' })
    expect(cards()).toEqual(['Oppenheimer', 'Past Lives'])
  })

  it('ignores an address it does not understand', async () => {
    await mount(SHELF, '/library?tab=musik&status=lari&rating=99')
    await screen.findAllByRole('heading', { level: 3 })
    expect(shelfHeadings()).toHaveLength(5)
  })

  it('finds an item by a word from its title, its director or its genre', async () => {
    await mount()
    const search = await screen.findByRole('searchbox', { name: 'Cari di Library' })
    fireEvent.change(search, { target: { value: 'harari' } })
    await waitFor(() => expect(cards()).toEqual(['Sapiens']))
    fireEvent.change(search, { target: { value: 'sejarah' } })
    await waitFor(() => expect(cards().sort()).toEqual(['Oppenheimer', 'The Zone of Interest']))
  })

  it('says so when nothing matches, and clears the filters from there', async () => {
    await mount()
    fireEvent.change(await screen.findByRole('searchbox', { name: 'Cari di Library' }), { target: { value: 'zzzz' } })
    expect(await screen.findByText('Tidak ada yang cocok')).toBeTruthy()
    fireEvent.click(within(screen.getByText('Tidak ada yang cocok').closest('div')!.parentElement!).getByRole('button', { name: 'Hapus filter' }))
    await waitFor(() => expect(shelfHeadings()).toHaveLength(5))
    expect(here()).toBe('/library')
  })

  it('filters by status and by minimum rating', async () => {
    await mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Ingin' }))
    await waitFor(() => expect(cards()).toEqual(['The Zone of Interest']))
    fireEvent.click(screen.getByRole('button', { name: 'Semua' }))
    fireEvent.change(screen.getByLabelText('Rating'), { target: { value: '8' } }) // four stars and up
    await waitFor(() => expect(cards().sort()).toEqual(['Oppenheimer', 'Past Lives']))
  })

  it('switches to the list view', async () => {
    await mount()
    fireEvent.click(await screen.findByRole('radio', { name: 'Daftar' }))
    const table = await screen.findByRole('table', { name: 'Daftar film dan buku' })
    expect(within(table).getAllByRole('row')).toHaveLength(6) // header and five items
    expect(here()).toContain('tampilan=daftar')
  })

  it('puts what is in progress on top, and takes it away while a filter is on', async () => {
    await mount()
    const rail = await screen.findByRole('region', { name: 'Sedang berlangsung' })
    expect(within(rail).getByRole('heading', { name: 'Bumi Manusia' })).toBeTruthy()
    expect(within(rail).getByText('100 / 500 hlm')).toBeTruthy()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'past' } })
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Sedang berlangsung' })).toBeNull())
  })

  it('counts this year in the strip', async () => {
    await mount()
    expect((await screen.findByText(/^Film 20\d\d$/)).previousElementSibling?.textContent).toBe('2')
  })
})

describe('quick actions on a card', () => {
  it('marks a favourite', async () => {
    await mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Jadikan Oppenheimer favorit' }))
    await waitFor(() => expect(stored<LibraryItem>('library-items').find((i) => i.id === 'f1')?.favorite).toBe(true))
    expect(screen.getByRole('button', { name: 'Hapus Oppenheimer dari favorit' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('changes where a book stands, and finishing it stamps today and takes it to the last page', async () => {
    await mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Ubah status Bumi Manusia' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Selesai dibaca' }))
    await waitFor(() => expect(stored<LibraryItem>('library-items').find((i) => i.id === 'b1')?.status).toBe('done'))
    const book = stored<LibraryItem>('library-items').find((i) => i.id === 'b1')!
    expect(book.finishedAt).toBe(isoDay(0))
    expect(book.currentPage).toBe(500)
  })

  it('clears the finish date when something finished is started again', async () => {
    await mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Ubah status Sapiens' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sedang dibaca' }))
    await waitFor(() => expect(stored<LibraryItem>('library-items').find((i) => i.id === 'b2')?.status).toBe('active'))
    expect(stored<LibraryItem>('library-items').find((i) => i.id === 'b2')?.finishedAt).toBeUndefined()
  })
})

describe('adding', () => {
  it('invites the first item when the library is empty', async () => {
    await mount([])
    expect(await screen.findByText('Library masih kosong')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tambah buku' }))
    const dialog = await screen.findByRole('dialog', { name: 'Tambah ke Library' })
    expect(within(dialog).getByRole('radio', { name: 'Buku', checked: true })).toBeTruthy()
  })

  it('adds a film and opens its page', async () => {
    await mount()
    fireEvent.click(await screen.findByRole('button', { name: /Tambah$/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Tambah ke Library' })
    fireEvent.change(within(dialog).getByLabelText('Judul'), { target: { value: 'Perfect Days' } })
    fireEvent.change(within(dialog).getByLabelText('Tahun'), { target: { value: '2023' } })
    fireEvent.change(within(dialog).getByLabelText('Genre'), { target: { value: 'Drama, Slice of life' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tambahkan' }))

    await waitFor(() => expect(stored<LibraryItem>('library-items')).toHaveLength(6))
    const created = stored<LibraryItem>('library-items').find((i) => i.title === 'Perfect Days')!
    expect(created).toMatchObject({ kind: 'film', year: 2023, genres: ['Drama', 'Slice of life'], status: 'planned' })
    expect(created.order).toBeGreaterThan(1000) // after every film already there
    await waitFor(() => expect(here()).toBe(`/library/film/${created.id}`))
  })

  it('adds a book with its authors and pages', async () => {
    await mount()
    fireEvent.click(await screen.findByRole('button', { name: /Tambah$/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Tambah ke Library' })
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Buku' }))
    fireEvent.change(within(dialog).getByLabelText('Judul'), { target: { value: 'Cantik Itu Luka' } })
    fireEvent.change(within(dialog).getByLabelText('Penulis'), { target: { value: 'Eka Kurniawan' } })
    fireEvent.change(within(dialog).getByLabelText('Jumlah halaman'), { target: { value: '520' } })
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Sedang' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tambahkan' }))
    await waitFor(() => expect(stored<LibraryItem>('library-items').find((i) => i.title === 'Cantik Itu Luka')).toMatchObject({ kind: 'buku', authors: ['Eka Kurniawan'], pages: 520, status: 'active' }))
  })

  it('asks for a title and explains what is wrong with a field, then focuses it', async () => {
    await mount()
    fireEvent.click(await screen.findByRole('button', { name: /Tambah$/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Tambah ke Library' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tambahkan' }))
    expect((await within(dialog).findByRole('alert')).textContent).toBe('Judul wajib diisi.')

    fireEvent.change(within(dialog).getByLabelText('Judul'), { target: { value: 'X' } })
    fireEvent.change(within(dialog).getByLabelText('Tautan sampul'), { target: { value: 'javascript:alert(1)' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tambahkan' }))
    expect((await within(dialog).findByRole('alert')).textContent).toContain('http')
    expect(document.activeElement?.id).toBe('lib-coverUrl')
    expect(stored<LibraryItem>('library-items')).toHaveLength(5)
  })

  it('warns, without blocking, when it is already there', async () => {
    await mount()
    fireEvent.click(await screen.findByRole('button', { name: /Tambah$/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Tambah ke Library' })
    fireEvent.change(within(dialog).getByLabelText('Judul'), { target: { value: 'oppenheimer' } })
    expect((await within(dialog).findByRole('status')).textContent).toContain('sudah ada')
    expect(within(dialog).getByRole('link', { name: 'Oppenheimer' }).getAttribute('href')).toBe('/library/film/f1')
    expect((within(dialog).getByRole('button', { name: 'Tambahkan' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('opens with n and searches with /, but not while typing', async () => {
    await mount()
    const search = await screen.findByRole('searchbox', { name: 'Cari di Library' })
    fireEvent.keyDown(document.body, { key: '/' })
    expect(document.activeElement).toBe(search)
    fireEvent.keyDown(search, { key: 'n' })
    expect(screen.queryByRole('dialog')).toBeNull()
    search.blur()
    fireEvent.keyDown(document.body, { key: 'n' })
    expect(await screen.findByRole('dialog', { name: 'Tambah ke Library' })).toBeTruthy()
  })
})
