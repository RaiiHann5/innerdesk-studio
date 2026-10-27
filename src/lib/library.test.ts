import { describe, expect, it } from 'vitest'
import type { LibraryItem } from '@/types/domain'
import {
  DEFAULT_FILTERS,
  accentFor,
  accentOf,
  applyFilters,
  clampRating,
  creditOf,
  filtersToParams,
  findDuplicate,
  formatRating,
  formatRuntime,
  genresOf,
  halfFromPosition,
  inProgress,
  isNarrowed,
  matchesQuery,
  metaLine,
  normalizeTitle,
  parseFilters,
  progressOf,
  sortItems,
  statusLabel,
  stepRating,
  summarize,
} from './library'

const item = (fields: Partial<LibraryItem> = {}): LibraryItem => ({
  id: 'i1',
  createdAt: '2026-01-10T00:00:00.000Z',
  updatedAt: '2026-01-10T00:00:00.000Z',
  kind: 'film',
  title: 'Oppenheimer',
  status: 'done',
  genres: [],
  tags: [],
  order: 1000,
  ...fields,
})

describe('rating', () => {
  it('keeps whole half-stars in range and rejects the rest', () => {
    expect(clampRating(9)).toBe(9)
    expect(clampRating(4.6)).toBe(5)
    expect(clampRating(11)).toBe(10)
    expect(clampRating(0)).toBeUndefined()
    expect(clampRating(-3)).toBeUndefined()
    expect(clampRating(Number.NaN)).toBeUndefined()
    expect(clampRating(undefined)).toBeUndefined()
  })

  it('shows half-stars as stars with a decimal comma', () => {
    expect([1, 2, 9, 10].map(formatRating)).toEqual(['0,5', '1', '4,5', '5'])
  })

  it('steps by half a star, clears below the bottom and stops at the top', () => {
    expect(stepRating(undefined, 1)).toBe(1)
    expect(stepRating(9, 1)).toBe(10)
    expect(stepRating(10, 1)).toBe(10)
    expect(stepRating(2, -1)).toBe(1)
    expect(stepRating(1, -1)).toBeUndefined()
    expect(stepRating(undefined, -1)).toBeUndefined()
  })
})

describe('halfFromPosition', () => {
  // A row 100 wide that starts at x = 10: each half-star is 10 wide.
  const at = (x: number) => halfFromPosition(x, 10, 100)

  it('maps the left and right half of each star', () => {
    expect([at(11), at(19), at(21), at(29), at(31)]).toEqual([1, 1, 2, 2, 3])
    expect(at(60)).toBe(5)
    expect(at(109)).toBe(10)
  })

  it('gives the top rating at the far edge and nothing at the near one', () => {
    expect(at(110)).toBe(10)
    expect(at(10)).toBeUndefined() // exactly on the left edge is before the first half
  })

  it('gives nothing outside the row or for a row with no width', () => {
    expect(at(5)).toBeUndefined()
    expect(at(120)).toBeUndefined()
    expect(halfFromPosition(10, 0, 0)).toBeUndefined()
  })
})

describe('words', () => {
  it('names a status for the kind of thing it is', () => {
    expect(statusLabel('film', 'planned')).toBe('Ingin ditonton')
    expect(statusLabel('buku', 'planned')).toBe('Ingin dibaca')
    expect(statusLabel('buku', 'done')).toBe('Selesai dibaca')
  })

  it('writes a runtime the short way', () => {
    expect([180, 124, 45, 0, undefined].map(formatRuntime)).toEqual(['3 j', '2 j 4 m', '45 m', '', ''])
  })

  it('credits the director of a film and the authors of a book', () => {
    expect(creditOf(item({ director: 'Christopher Nolan' }))).toBe('Christopher Nolan')
    expect(creditOf(item({ kind: 'buku', authors: ['A', 'B'] }))).toBe('A, B')
    expect(creditOf(item())).toBe('')
  })

  it('builds the meta line from what is known', () => {
    expect(metaLine(item({ year: 2023, runtimeMin: 180, genres: ['Drama', 'Sejarah', 'Biografi'] }))).toBe('2023 · 3 j · Drama, Sejarah')
    expect(metaLine(item({ kind: 'buku', year: 1989, pages: 258, genres: ['Fiksi'] }))).toBe('1989 · 258 hlm · Fiksi')
    expect(metaLine(item())).toBe('')
  })
})

describe('accent', () => {
  it('gives a title the same colour every time, ignoring case and accents', () => {
    expect(accentFor('Amélie')).toBe(accentFor('amelie'))
    expect(accentFor('Oppenheimer')).toBe(accentFor('Oppenheimer'))
  })

  it('uses the item’s own accent when it has one', () => {
    expect(accentOf({ title: 'X', accent: 'teal' })).toBe('teal')
    expect(['moss', 'ochre', 'clay', 'teal', 'slate', 'rosewood']).toContain(accentOf({ title: 'X' }))
  })

  it('spreads different titles over more than one colour', () => {
    const titles = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta']
    expect(new Set(titles.map(accentFor)).size).toBeGreaterThan(2)
  })
})

describe('progressOf', () => {
  it('measures how far into a book', () => {
    expect(progressOf({ kind: 'buku', pages: 535, currentPage: 212 })).toEqual({ page: 212, pages: 535, percent: 40 })
  })
  it('keeps the page inside the book', () => {
    expect(progressOf({ kind: 'buku', pages: 100, currentPage: 400 })?.page).toBe(100)
    expect(progressOf({ kind: 'buku', pages: 100, currentPage: -5 })?.page).toBe(0)
    expect(progressOf({ kind: 'buku', pages: 100 })?.percent).toBe(0)
  })
  it('is null for a film and for a book of unknown length', () => {
    expect(progressOf({ kind: 'film', pages: 100, currentPage: 4 })).toBeNull()
    expect(progressOf({ kind: 'buku', currentPage: 4 })).toBeNull()
    expect(progressOf({ kind: 'buku', pages: 0, currentPage: 0 })).toBeNull()
  })
})

describe('filters in the address', () => {
  const read = (qs: string) => parseFilters(new URLSearchParams(qs))

  it('has a plain address when nothing is set, and reads it back', () => {
    expect(filtersToParams(DEFAULT_FILTERS)).toEqual({})
    expect(read('')).toEqual(DEFAULT_FILTERS)
  })

  it('round-trips a full set of filters', () => {
    const f = { tab: 'buku', status: 'done', genre: 'Fiksi', minRating: 8, q: 'ishiguro', sort: 'rating', view: 'daftar' } as const
    expect(read(new URLSearchParams(filtersToParams(f)).toString())).toEqual(f)
  })

  it('falls back to the default for anything unknown or out of range', () => {
    expect(read('tab=musik&status=lari&urut=acak&tampilan=3d&rating=99')).toEqual(DEFAULT_FILTERS)
    expect(read('rating=2.5').minRating).toBe(0)
    expect(read('rating=abc').minRating).toBe(0)
  })

  it('knows when the list is narrowed', () => {
    expect(isNarrowed(DEFAULT_FILTERS)).toBe(false)
    expect(isNarrowed({ ...DEFAULT_FILTERS, tab: 'buku', sort: 'judul' })).toBe(false)
    expect(isNarrowed({ ...DEFAULT_FILTERS, q: '  ' })).toBe(false)
    expect(isNarrowed({ ...DEFAULT_FILTERS, genre: 'Drama' })).toBe(true)
    expect(isNarrowed({ ...DEFAULT_FILTERS, minRating: 2 })).toBe(true)
  })
})

describe('searching', () => {
  const film = item({ title: 'Amélie', director: 'Jean-Pierre Jeunet', cast: [{ name: 'Audrey Tautou' }], genres: ['Komedi'], tags: ['paris'] })

  it('ignores case, accents and punctuation', () => {
    expect(normalizeTitle('  Amélie: Le Fabuleux!  ')).toBe('amelie le fabuleux')
    expect(matchesQuery(film, 'AMELIE')).toBe(true)
  })

  it('needs every word, found anywhere in title, credits, cast, genre or tags', () => {
    expect(matchesQuery(film, 'tautou paris')).toBe(true)
    expect(matchesQuery(film, 'jeunet komedi')).toBe(true)
    expect(matchesQuery(film, 'tautou tokyo')).toBe(false)
  })

  it('matches everything on an empty query', () => {
    expect(matchesQuery(film, '   ')).toBe(true)
  })
})

describe('applyFilters and sortItems', () => {
  const items = [
    item({ id: 'a', title: 'Alpha', kind: 'film', status: 'done', rating: 9, year: 2020, genres: ['Drama'], finishedAt: '2026-03-01' }),
    item({ id: 'b', title: 'Beta', kind: 'buku', status: 'active', rating: 5, year: 2010, genres: ['Fiksi'] }),
    item({ id: 'c', title: 'Gamma', kind: 'film', status: 'planned', year: 2024, genres: ['Drama', 'Sejarah'] }),
    item({ id: 'd', title: 'Delta', kind: 'buku', status: 'done', rating: 10, year: 1999, genres: ['Fiksi'], finishedAt: '2026-06-01' }),
  ]
  const ids = (list: LibraryItem[]) => list.map((i) => i.id)

  it('filters by tab, status, genre and minimum rating together', () => {
    expect(ids(applyFilters(items, { ...DEFAULT_FILTERS, tab: 'film' }))).toEqual(['a', 'c'])
    expect(ids(applyFilters(items, { ...DEFAULT_FILTERS, status: 'done' }))).toEqual(['a', 'd'])
    expect(ids(applyFilters(items, { ...DEFAULT_FILTERS, genre: 'Drama' }))).toEqual(['a', 'c'])
    expect(ids(applyFilters(items, { ...DEFAULT_FILTERS, minRating: 9 }))).toEqual(['a', 'd'])
    expect(ids(applyFilters(items, { ...DEFAULT_FILTERS, tab: 'buku', status: 'done', genre: 'Fiksi', minRating: 10 }))).toEqual(['d'])
  })

  it('leaves unrated items out of a minimum-rating filter', () => {
    expect(ids(applyFilters(items, { ...DEFAULT_FILTERS, minRating: 1 }))).not.toContain('c')
  })

  it('sorts by title, year and rating, unrated last', () => {
    expect(ids(sortItems(items, 'judul'))).toEqual(['a', 'b', 'd', 'c'])
    expect(ids(sortItems(items, 'tahun'))).toEqual(['c', 'a', 'b', 'd'])
    expect(ids(sortItems(items, 'rating'))).toEqual(['d', 'a', 'b', 'c'])
  })

  it('puts the most recently finished first, then the rest by when they were added', () => {
    // d and a have finish dates; b and c were both added on 10 Jan and tie on order, so title decides.
    expect(ids(sortItems(items, 'terbaru'))).toEqual(['d', 'a', 'b', 'c'])
  })

  it('does not change the list it was given', () => {
    const before = ids(items)
    sortItems(items, 'judul')
    expect(ids(items)).toEqual(before)
  })

  it('lists genres once, alphabetically', () => {
    expect(genresOf(items)).toEqual(['Drama', 'Fiksi', 'Sejarah'])
  })

  it('lists what is in progress, latest touched first', () => {
    const list = [
      item({ id: 'x', status: 'active', updatedAt: '2026-01-01T00:00:00.000Z' }),
      item({ id: 'y', status: 'active', updatedAt: '2026-02-01T00:00:00.000Z' }),
      item({ id: 'z', status: 'done' }),
    ]
    expect(ids(inProgress(list))).toEqual(['y', 'x'])
  })
})

describe('findDuplicate', () => {
  const have = [
    item({ id: 'f', kind: 'film', title: 'Oppenheimer', year: 2023 }),
    item({ id: 'b', kind: 'buku', title: 'The Remains of the Day', authors: ['Kazuo Ishiguro'], isbn: '978-0-571-20399-2' }),
  ]

  it('matches a film on title, and on year when both have one', () => {
    expect(findDuplicate(have, { kind: 'film', title: 'oppenheimer', year: 2023 })?.id).toBe('f')
    expect(findDuplicate(have, { kind: 'film', title: 'Oppenheimer', year: 1980 })).toBeUndefined()
    expect(findDuplicate(have, { kind: 'film', title: 'Oppenheimer' })?.id).toBe('f')
  })

  it('matches a book on ISBN however it is written', () => {
    expect(findDuplicate(have, { kind: 'buku', title: 'Another title', isbn: '9780571203992' })?.id).toBe('b')
  })

  it('matches a book on title and first author', () => {
    expect(findDuplicate(have, { kind: 'buku', title: 'the remains of the day', authors: ['Kazuo Ishiguro'] })?.id).toBe('b')
    expect(findDuplicate(have, { kind: 'buku', title: 'The Remains of the Day', authors: ['Someone Else'] })).toBeUndefined()
  })

  it('does not match across kinds, on an empty title, or an item with itself', () => {
    expect(findDuplicate(have, { kind: 'buku', title: 'Oppenheimer' })).toBeUndefined()
    expect(findDuplicate(have, { kind: 'film', title: '   ' })).toBeUndefined()
    expect(findDuplicate(have, { kind: 'film', title: 'Oppenheimer', year: 2023 }, 'f')).toBeUndefined()
  })
})

describe('summarize', () => {
  const list = [
    item({ id: '1', kind: 'film', status: 'done', finishedAt: '2026-02-01', rating: 8 }),
    item({ id: '2', kind: 'film', status: 'done', finishedAt: '2025-12-31', rating: 10 }),
    item({ id: '3', kind: 'buku', status: 'done', finishedAt: '2026-05-01', pages: 300, rating: 6 }),
    item({ id: '4', kind: 'buku', status: 'done', finishedAt: '2026-06-01', pages: 200 }),
    item({ id: '5', kind: 'buku', status: 'active', pages: 900 }),
  ]

  it('counts what was finished this year, and the pages of the books', () => {
    expect(summarize(list, 2026)).toMatchObject({ filmsThisYear: 1, booksThisYear: 2, pagesThisYear: 500 })
  })

  it('averages every rating in stars', () => {
    expect(summarize(list, 2026).averageStars).toBe((8 + 10 + 6) / 3 / 2)
  })

  it('has no average when nothing is rated', () => {
    expect(summarize([item({ rating: undefined })], 2026).averageStars).toBeNull()
    expect(summarize([], 2026)).toEqual({ filmsThisYear: 0, booksThisYear: 0, pagesThisYear: 0, averageStars: null })
  })
})
