import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { STORAGE_PREFIX } from '@/lib/config'
import { useLibraryItemStore, useLibraryLogStore, useLibraryQuoteStore, useNoteStore } from '@/stores/entities'
import type { LibraryItem, LibraryLog, LibraryQuote, Note } from '@/types/domain'

/** Shared by the Library tests: a film and a book with every required field, and a way to put data in storage and render a page. */
export const makeItem = (overrides: Partial<LibraryItem> = {}): LibraryItem => ({
  id: 'i1',
  createdAt: '2026-01-10T00:00:00.000Z',
  updatedAt: '2026-01-10T00:00:00.000Z',
  kind: 'film',
  title: 'Oppenheimer',
  year: 2023,
  status: 'done',
  genres: ['Drama'],
  tags: [],
  order: 1000,
  ...overrides,
})

export const makeBook = (overrides: Partial<LibraryItem> = {}): LibraryItem =>
  makeItem({ id: 'b1', kind: 'buku', title: 'Bumi Manusia', year: 1980, status: 'active', authors: ['Pramoedya Ananta Toer'], pages: 500, currentPage: 100, genres: ['Fiksi'], ...overrides })

export const makeLog = (overrides: Partial<LibraryLog> = {}): LibraryLog => ({ id: 'l1', createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '', itemId: 'i1', date: '2026-02-01', ...overrides })
export const makeQuote = (overrides: Partial<LibraryQuote> = {}): LibraryQuote => ({ id: 'q1', createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '', itemId: 'i1', text: 'Sebuah adegan.', ...overrides })

interface Seed {
  items?: LibraryItem[]
  logs?: LibraryLog[]
  quotes?: LibraryQuote[]
  notes?: Note[]
}

export async function seedLibrary({ items = [], logs = [], quotes = [], notes = [] }: Seed = {}) {
  localStorage.setItem(STORAGE_PREFIX + 'library-items', JSON.stringify(items))
  localStorage.setItem(STORAGE_PREFIX + 'library-logs', JSON.stringify(logs))
  localStorage.setItem(STORAGE_PREFIX + 'library-quotes', JSON.stringify(quotes))
  localStorage.setItem(STORAGE_PREFIX + 'notes-v2', JSON.stringify(notes))
  await Promise.all([useLibraryItemStore.getState().load(), useLibraryLogStore.getState().load(), useLibraryQuoteStore.getState().load(), useNoteStore.getState().load()])
}

export const stored = <T,>(key: string): T[] => JSON.parse(localStorage.getItem(STORAGE_PREFIX + key) ?? '[]') as T[]

/** Shows where the router is, so a test can tell that a page sent the person somewhere. */
export function Here() {
  const { pathname, search } = useLocation()
  return <p data-testid="here">{pathname + search}</p>
}

export function renderAt(initial: string, page: React.ReactNode, path: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path={path} element={<>{page}<Here /></>} />
        <Route path="*" element={<Here />} />
      </Routes>
    </MemoryRouter>,
  )
}
