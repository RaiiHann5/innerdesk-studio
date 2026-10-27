// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isoDay } from '@/lib/date'
import { useUiStore } from '@/stores/ui'
import type { LibraryItem, LibraryLog, LibraryQuote, Note, NoteContent } from '@/types/domain'
import { stubBrowser } from '../../projects/testSetup'
import { makeBook, makeItem, makeLog, makeQuote, renderAt, seedLibrary, stored } from '../testkit'
import LibraryDetailPage from './LibraryDetailPage'

const here = () => screen.getByTestId('here').textContent
const toast = () => useUiStore.getState().toast
const item = (id = 'i1') => stored<LibraryItem>('library-items').find((i) => i.id === id)!

const REVIEW: NoteContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Akhir yang menghantui.' }] }] }

const FILM = makeItem({
  id: 'i1',
  title: 'Oppenheimer',
  originalTitle: 'Oppenheimer (2023)',
  status: 'planned',
  synopsis: 'Kisah fisikawan yang memimpin pembuatan bom atom.',
  director: 'Christopher Nolan',
  runtimeMin: 180,
  genres: ['Drama', 'Sejarah'],
  tags: ['biografi'],
  cast: [
    { name: 'Cillian Murphy', character: 'J. Robert Oppenheimer' },
    { name: 'Emily Blunt', character: 'Kitty' },
  ],
  crew: [{ name: 'Hoyte van Hoytema', job: 'Sinematografi' }],
})
const BOOK = makeBook({ id: 'b1', title: 'Bumi Manusia', status: 'planned', pages: 500, currentPage: 0, isbn: '9786021234567', publisher: 'Hasta Mitra', format: 'cetak' })

async function film(extra: Parameters<typeof seedLibrary>[0] = {}, initial = '/library/film/i1', items: LibraryItem[] = [FILM]) {
  await seedLibrary({ items, ...extra })
  return renderAt(initial, <LibraryDetailPage />, '/library/film/:itemId')
}
async function book(extra: Parameters<typeof seedLibrary>[0] = {}, initial = '/library/buku/b1', items: LibraryItem[] = [BOOK]) {
  await seedLibrary({ items, ...extra })
  return renderAt(initial, <LibraryDetailPage />, '/library/buku/:itemId')
}

beforeEach(() => {
  stubBrowser()
  useUiStore.setState({ toast: null })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('the top of the page', () => {
  it('sets the film’s title, its director and the facts about it', async () => {
    await film()
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Oppenheimer')
    expect(screen.getByText('Sutradara Christopher Nolan')).toBeTruthy()
    expect(screen.getByText('2023 · 3 j · Drama, Sejarah')).toBeTruthy()
  })

  it('sets a book’s author and length', async () => {
    await book()
    await screen.findByRole('heading', { level: 1, name: 'Bumi Manusia' })
    expect(screen.getByText('oleh Pramoedya Ananta Toer')).toBeTruthy()
    expect(screen.getByText('1980 · 500 hlm · Fiksi')).toBeTruthy()
  })

  it('says the item is gone when it is, and sends a wrong kind to the right address', async () => {
    await film({}, '/library/film/ghost')
    expect(await screen.findByText('Tidak ditemukan')).toBeTruthy()
    cleanup()
    await seedLibrary({ items: [FILM] })
    renderAt('/library/buku/i1', <LibraryDetailPage />, '/library/buku/:itemId')
    await waitFor(() => expect(here()).toBe('/library/film/i1'))
  })
})

describe('rating', () => {
  it('is set from the keyboard in half-stars and read out in words', async () => {
    await film()
    const slider = await screen.findByRole('slider', { name: 'Rating Oppenheimer' })
    expect(slider.getAttribute('aria-valuetext')).toBe('Belum dinilai')

    slider.focus()
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    await waitFor(() => expect(item().rating).toBe(1))
    expect(slider.getAttribute('aria-valuetext')).toBe('0,5 dari 5 bintang')
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    await waitFor(() => expect(item().rating).toBe(2))

    fireEvent.keyDown(slider, { key: '4' })
    await waitFor(() => expect(item().rating).toBe(8))
    expect(slider.getAttribute('aria-valuenow')).toBe('4')
    fireEvent.keyDown(slider, { key: 'End' })
    await waitFor(() => expect(item().rating).toBe(10))
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(item().rating).toBe(10)
  })

  it('is cleared by Escape, Delete, 0, or stepping below half a star', async () => {
    await film({ items: [{ ...FILM, rating: 9 }] })
    const slider = await screen.findByRole('slider', { name: 'Rating Oppenheimer' })
    for (const key of ['Escape', 'Delete', '0']) {
      fireEvent.keyDown(slider, { key: '5' })
      await waitFor(() => expect(item().rating).toBe(10))
      fireEvent.keyDown(slider, { key })
      await waitFor(() => expect(item().rating).toBeUndefined())
    }
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    await waitFor(() => expect(item().rating).toBe(1))
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    await waitFor(() => expect(item().rating).toBeUndefined())
  })

  it('leaves other keys alone', async () => {
    await film()
    const slider = await screen.findByRole('slider', { name: 'Rating Oppenheimer' })
    expect(fireEvent.keyDown(slider, { key: 'a' })).toBe(true) // not prevented
    expect(fireEvent.keyDown(slider, { key: 'ArrowRight' })).toBe(false) // handled
  })
})

describe('status', () => {
  it('finishing stamps today and offers the date to change', async () => {
    await film()
    fireEvent.click(await screen.findByRole('radio', { name: 'Selesai' }))
    await waitFor(() => expect(item().status).toBe('done'))
    expect(item().finishedAt).toBe(isoDay(0))
    const date = screen.getByLabelText('Selesai pada') as HTMLInputElement
    expect(date.value).toBe(isoDay(0))

    fireEvent.change(date, { target: { value: '2026-01-02' } })
    await waitFor(() => expect(item().finishedAt).toBe('2026-01-02'))
  })

  it('leaving finished takes the date away, and the date field with it', async () => {
    await film({ items: [{ ...FILM, status: 'done', finishedAt: '2026-01-02' }] })
    fireEvent.click(await screen.findByRole('radio', { name: 'Sedang' }))
    await waitFor(() => expect(item().status).toBe('active'))
    expect(item().finishedAt).toBeUndefined()
    expect(screen.queryByLabelText('Selesai pada')).toBeNull()
  })

  it('names the status in full for the kind of thing it is', async () => {
    await book()
    expect(await screen.findByText('Ingin dibaca')).toBeTruthy()
  })

  it('toggles a favourite', async () => {
    await film()
    const button = await screen.findByRole('button', { name: 'Favorit' })
    fireEvent.click(button)
    await waitFor(() => expect(item().favorite).toBe(true))
    expect(button.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(button)
    await waitFor(() => expect(item().favorite).toBeUndefined())
  })
})

describe('reading progress', () => {
  it('shows how far in, and moves it', async () => {
    await book({ items: [{ ...BOOK, status: 'active', currentPage: 100 }] })
    expect(await screen.findByText('100 / 500 hlm · 20%')).toBeTruthy()
    const input = screen.getByLabelText('Sampai halaman') as HTMLInputElement
    fireEvent.change(input, { target: { value: '250' } })
    fireEvent.click(screen.getByRole('button', { name: 'Perbarui' }))
    await waitFor(() => expect(item('b1').currentPage).toBe(250))
    expect(await screen.findByText('250 / 500 hlm · 50%')).toBeTruthy()
  })

  it('starts a book that was only wanted, and finishes it at the last page', async () => {
    await book()
    fireEvent.change(await screen.findByLabelText('Sampai halaman'), { target: { value: '30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Perbarui' }))
    await waitFor(() => expect(item('b1').status).toBe('active'))

    fireEvent.change(screen.getByLabelText('Sampai halaman'), { target: { value: '500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Perbarui' }))
    await waitFor(() => expect(item('b1').status).toBe('done'))
    expect(item('b1').finishedAt).toBe(isoDay(0))
    expect(toast()?.message).toBe('Ditandai selesai dibaca.')
  })

  it('does not accept a page past the end, or no change', async () => {
    await book({ items: [{ ...BOOK, status: 'active', currentPage: 100 }] })
    const input = await screen.findByLabelText('Sampai halaman')
    const button = screen.getByRole('button', { name: 'Perbarui' }) as HTMLButtonElement
    expect(button.disabled).toBe(true) // nothing changed yet
    fireEvent.change(input, { target: { value: '501' } })
    expect(button.disabled).toBe(true)
    expect(screen.getByText('Antara 0 dan 500.')).toBeTruthy()
    fireEvent.change(input, { target: { value: 'abc' } })
    expect(button.disabled).toBe(true)
  })

  it('asks for the length when it is not known', async () => {
    await book({ items: [{ ...BOOK, pages: undefined }] })
    expect(await screen.findByText(/Isi jumlah halaman/)).toBeTruthy()
  })
})

describe('the overview', () => {
  it('shows the synopsis, the cast and the credits', async () => {
    await film()
    expect(await screen.findByText('Kisah fisikawan yang memimpin pembuatan bom atom.')).toBeTruthy()
    const cast = screen.getByRole('list', { name: 'Pemeran utama' })
    expect(within(cast).getAllByRole('listitem')).toHaveLength(2)
    expect(within(cast).getByText('Cillian Murphy')).toBeTruthy()
    expect(within(cast).getByText('J. Robert Oppenheimer')).toBeTruthy()
    const rincian = screen.getByRole('complementary', { name: 'Rincian' })
    expect(within(rincian).getByText('Sinematografi').nextElementSibling?.textContent).toBe('Hoyte van Hoytema')
  })

  it('sets a book’s details like a colophon, leaving out what is empty', async () => {
    await book({ items: [{ ...BOOK, publisher: undefined }] })
    const rincian = await screen.findByRole('complementary', { name: 'Rincian' })
    expect(within(rincian).getByText('ISBN').nextElementSibling?.textContent).toBe('9786021234567')
    expect(within(rincian).queryByText('Penerbit')).toBeNull()
    expect(within(rincian).getByText('Format').nextElementSibling?.textContent).toBe('Cetak')
  })
})

describe('the review', () => {
  it('invites a first one', async () => {
    await film({}, '/library/film/i1?tab=ulasan')
    expect(await screen.findByText(/Belum ada ulasan/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tulis ulasan' }))
    expect(await screen.findByRole('toolbar', { name: 'Format ulasan' })).toBeTruthy()
    expect(await screen.findByRole('textbox', { name: 'Ulasan Oppenheimer' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Selesai' })).toBeTruthy()
  })

  it('shows an existing review as written', async () => {
    await film({ items: [{ ...FILM, review: REVIEW, reviewExcerpt: 'Akhir yang menghantui.' }] }, '/library/film/i1?tab=ulasan')
    expect(await screen.findByText('Akhir yang menghantui.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Tampilkan ulasan/ })).toBeNull()
  })

  it('keeps a review with spoilers hidden until asked, and reads it to no one meanwhile', async () => {
    await film({ items: [{ ...FILM, review: REVIEW, reviewExcerpt: 'Akhir yang menghantui.', reviewHasSpoilers: true }] }, '/library/film/i1?tab=ulasan')
    const reveal = await screen.findByRole('button', { name: /Tampilkan ulasan/ })
    const text = await screen.findByText('Akhir yang menghantui.')
    expect(text.closest('[aria-hidden="true"]')).not.toBeNull()
    fireEvent.click(reveal)
    await waitFor(() => expect(screen.queryByRole('button', { name: /Tampilkan ulasan/ })).toBeNull())
    expect(text.closest('[aria-hidden="true"]')).toBeNull()
  })

  it('marks and unmarks spoilers', async () => {
    await film({}, '/library/film/i1?tab=ulasan')
    const toggle = await screen.findByRole('switch', { name: 'Mengandung spoiler' })
    fireEvent.click(toggle)
    await waitFor(() => expect(item().reviewHasSpoilers).toBe(true))
    fireEvent.click(toggle)
    await waitFor(() => expect(item().reviewHasSpoilers).toBeUndefined())
  })
})

describe('quotes and scenes', () => {
  it('adds one with where it is, and asks for the text first', async () => {
    await film({}, '/library/film/i1?tab=kutipan')
    fireEvent.click(await screen.findByRole('button', { name: 'Tambah adegan' }))
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Tulis adegan atau dialognya dulu.')
    fireEvent.change(screen.getByLabelText('Adegan atau dialog'), { target: { value: 'Uji coba Trinity.' } })
    fireEvent.change(screen.getByLabelText('Menit'), { target: { value: '1:58:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(stored<LibraryQuote>('library-quotes')).toMatchObject([{ itemId: 'i1', text: 'Uji coba Trinity.', locator: '1:58:00' }]))
    expect(await screen.findByText('1:58:00')).toBeTruthy()
  })

  it('words things for a book as passages', async () => {
    await book({}, '/library/buku/b1?tab=kutipan')
    expect(await screen.findByRole('button', { name: 'Tambah kutipan' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Kutipan & sorotan' })).toBeTruthy()
  })

  it('copies the text and deletes with undo', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await film({ quotes: [makeQuote({ text: 'Hening dulu.', locator: '1:58:00' })] }, '/library/film/i1?tab=kutipan')
    fireEvent.click(await screen.findByRole('button', { name: 'Salin kutipan' }))
    expect(writeText).toHaveBeenCalledWith('Hening dulu.')
    await waitFor(() => expect(toast()?.message).toBe('Kutipan disalin'))

    fireEvent.click(screen.getByRole('button', { name: 'Hapus kutipan' }))
    await waitFor(() => expect(stored('library-quotes')).toEqual([]))
    toast()!.action!.run()
    await waitFor(() => expect(stored<LibraryQuote>('library-quotes').map((q) => q.id)).toEqual(['q1']))
    expect(await screen.findByText('Hening dulu.')).toBeTruthy()
  })
})

describe('history', () => {
  it('counts viewings, and a viewing marks the film watched on that day', async () => {
    await film({}, '/library/film/i1?tab=riwayat')
    fireEvent.click(await screen.findByRole('button', { name: 'Catat tontonan' }))
    fireEvent.change(screen.getByLabelText('Tanggal'), { target: { value: '2026-02-14' } })
    fireEvent.change(screen.getByLabelText('Di mana'), { target: { value: 'Bioskop' } })
    fireEvent.change(screen.getByLabelText('Bersama'), { target: { value: 'Rani' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))

    await waitFor(() => expect(stored<LibraryLog>('library-logs')).toMatchObject([{ itemId: 'i1', date: '2026-02-14', place: 'Bioskop', withWhom: 'Rani' }]))
    await waitFor(() => expect(item().status).toBe('done'))
    expect(item().finishedAt).toBe('2026-02-14')
    expect(await screen.findByText('Bioskop · bersama Rani')).toBeTruthy()
    expect(screen.getByText('kali', { exact: false }).textContent).toContain('1')
  })

  it('lists newest first, and removes one with undo', async () => {
    await film({ logs: [makeLog({ id: 'l1', date: '2026-01-01' }), makeLog({ id: 'l2', date: '2026-03-01' })] }, '/library/film/i1?tab=riwayat')
    const rows = within(await screen.findByRole('list')).getAllByRole('listitem')
    expect(rows[0].textContent).toContain('1 Maret 2026')
    expect(rows[1].textContent).toContain('1 Januari 2026')
    fireEvent.click(screen.getByRole('button', { name: 'Hapus riwayat 1 Maret 2026' }))
    await waitFor(() => expect(stored<LibraryLog>('library-logs').map((l) => l.id)).toEqual(['l1']))
    toast()!.action!.run()
    await waitFor(() => expect(stored('library-logs')).toHaveLength(2))
  })

  it('records a reading session and moves the book to where it ended', async () => {
    await book({ items: [{ ...BOOK, status: 'active', currentPage: 100 }] }, '/library/buku/b1?tab=riwayat')
    fireEvent.click(await screen.findByRole('button', { name: 'Catat sesi baca' }))
    expect((screen.getByLabelText('Halaman awal') as HTMLInputElement).value).toBe('100')
    fireEvent.change(screen.getByLabelText('Halaman akhir'), { target: { value: '140' } })
    fireEvent.change(screen.getByLabelText('Lama (menit)'), { target: { value: '45' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(stored<LibraryLog>('library-logs')).toMatchObject([{ fromPage: 100, toPage: 140, minutes: 45 }]))
    await waitFor(() => expect(item('b1').currentPage).toBe(140))
    expect(await screen.findByText('hlm. 100–140 (40 hlm) · 45 menit')).toBeTruthy()
  })

  it('refuses a session that makes no sense', async () => {
    await book({ items: [{ ...BOOK, status: 'active', currentPage: 100 }] }, '/library/buku/b1?tab=riwayat')
    fireEvent.click(await screen.findByRole('button', { name: 'Catat sesi baca' }))
    const save = () => fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))

    save()
    expect((await screen.findByRole('alert')).textContent).toBe('Isi halaman akhir atau lama membaca.')
    fireEvent.change(screen.getByLabelText('Halaman akhir'), { target: { value: '90' } })
    save()
    expect((await screen.findByRole('alert')).textContent).toBe('Halaman akhir tidak boleh lebih kecil dari halaman awal.')
    fireEvent.change(screen.getByLabelText('Halaman akhir'), { target: { value: '900' } })
    save()
    expect((await screen.findByRole('alert')).textContent).toBe('Buku ini hanya 500 halaman.')
    expect(stored('library-logs')).toEqual([])
  })
})

describe('linked notes', () => {
  const note = (over: Partial<Note>): Note => ({ id: 'n1', createdAt: '', updatedAt: '2026-02-01T00:00:00.000Z', title: 'Pikiran tentang Nolan', content: { type: 'doc', content: [] }, excerpt: 'Struktur waktu yang rumit.', tags: [], pinned: false, libraryItemId: 'i1', ...over })

  it('lists notes written about it, and not archived ones or other items’', async () => {
    await film({ notes: [note({}), note({ id: 'n2', title: 'Diarsipkan', archivedAt: '2026-02-02T00:00:00.000Z' }), note({ id: 'n3', title: 'Tentang buku lain', libraryItemId: 'other' })] }, '/library/film/i1?tab=catatan')
    const link = await screen.findByRole('link', { name: /Pikiran tentang Nolan/ })
    expect(link.getAttribute('href')).toBe('/notes/n1')
    expect(screen.queryByText('Diarsipkan')).toBeNull()
    expect(screen.queryByText('Tentang buku lain')).toBeNull()
  })

  it('starts a new note about the item and opens it', async () => {
    await film({}, '/library/film/i1?tab=catatan')
    fireEvent.click(await screen.findByRole('button', { name: 'Tulis catatan' }))
    await waitFor(() => expect(stored<Note>('notes-v2')).toHaveLength(1))
    const created = stored<Note>('notes-v2')[0]
    expect(created).toMatchObject({ title: 'Oppenheimer', libraryItemId: 'i1', tags: ['film'], pinned: false })
    await waitFor(() => expect(here()).toBe(`/notes/${created.id}`))
  })
})

describe('editing and deleting', () => {
  it('edits in a dialog that is already filled in, and leaves the status and the rating alone', async () => {
    await film({ items: [{ ...FILM, status: 'done', finishedAt: '2026-01-02', rating: 9 }] })
    fireEvent.click(await screen.findByRole('button', { name: 'Menu untuk Oppenheimer' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Ubah' }))
    const dialog = await screen.findByRole('dialog', { name: 'Ubah Oppenheimer' })
    expect((within(dialog).getByLabelText('Sutradara') as HTMLInputElement).value).toBe('Christopher Nolan')
    expect(within(dialog).queryByText('Status awal')).toBeNull()
    fireEvent.change(within(dialog).getByLabelText('Sinopsis'), { target: { value: 'Ringkasan baru.' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Simpan perubahan' }))
    await waitFor(() => expect(item().synopsis).toBe('Ringkasan baru.'))
    expect(item()).toMatchObject({ status: 'done', finishedAt: '2026-01-02', rating: 9 })
  })

  it('deletes after asking, takes the history and quotes along, and undo brings all three back', async () => {
    await film({ logs: [makeLog()], quotes: [makeQuote()] })
    fireEvent.click(await screen.findByRole('button', { name: 'Menu untuk Oppenheimer' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Hapus' }))
    const dialog = await screen.findByRole('dialog', { name: 'Hapus Oppenheimer' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hapus' }))

    await waitFor(() => expect(stored('library-items')).toEqual([]))
    expect(stored('library-logs')).toEqual([])
    expect(stored('library-quotes')).toEqual([])
    await waitFor(() => expect(here()).toBe('/library'))

    toast()!.action!.run()
    await waitFor(() => expect(stored('library-items')).toHaveLength(1))
    await waitFor(() => expect(stored('library-logs')).toHaveLength(1))
    await waitFor(() => expect(stored('library-quotes')).toHaveLength(1))
  })

  it('does not delete when the question is dismissed', async () => {
    await film()
    fireEvent.click(await screen.findByRole('button', { name: 'Menu untuk Oppenheimer' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Hapus' }))
    const dialog = await screen.findByRole('dialog', { name: 'Hapus Oppenheimer' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Batal' }))
    expect(stored('library-items')).toHaveLength(1)
  })
})

describe('tabs', () => {
  it('open from the address and show how much is in each', async () => {
    await film({ logs: [makeLog(), makeLog({ id: 'l2' })], quotes: [makeQuote()] }, '/library/film/i1?tab=riwayat')
    expect(await screen.findByRole('heading', { name: 'Riwayat tonton' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Riwayat/ }).textContent).toContain('2')
    expect(screen.getByRole('tab', { name: /Adegan/ }).textContent).toContain('1')
    fireEvent.click(screen.getByRole('tab', { name: 'Ikhtisar' }))
    await waitFor(() => expect(here()).toBe('/library/film/i1'))
  })
})
