import type { CategoryColor, LibraryItem, LibraryKind, LibraryStatus } from '@/types/domain'

// ---------------------------------------------------------------------------------------------
// Rating
// ---------------------------------------------------------------------------------------------

/** Ratings are half-stars as whole numbers: 1 is half a star, 10 is five. */
export const RATING_MIN = 1
export const RATING_MAX = 10

/** Rounds into range, and returns undefined for anything that is not a usable rating (0, NaN, or empty). */
export function clampRating(value: number | undefined | null): number | undefined {
  if (value === undefined || value === null || !Number.isFinite(value) || value < RATING_MIN) return undefined
  return Math.min(RATING_MAX, Math.round(value))
}

/**
 * Which half-star a pointer is over, from where it is across the row of five stars. The left half of the first star is 1,
 * its right half 2, and so on to 10 at the right edge. A pointer outside the row, or a row with no width, gives nothing.
 */
export function halfFromPosition(x: number, left: number, width: number): number | undefined {
  if (!(width > 0)) return undefined
  const across = (x - left) / width
  if (across < 0 || across > 1) return undefined
  return clampRating(Math.ceil(across * RATING_MAX))
}

/** 9 becomes "4,5" and 10 becomes "5". */
export const formatRating = (rating: number): string => (rating / 2).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 })

/** Moves a rating by one half-star. Past the top stays at the top; below the bottom clears it. */
export function stepRating(rating: number | undefined, direction: 1 | -1): number | undefined {
  const next = (rating ?? 0) + direction
  return next < RATING_MIN ? undefined : Math.min(RATING_MAX, next)
}

// ---------------------------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------------------------

export const STATUSES: LibraryStatus[] = ['planned', 'active', 'done', 'dropped']

const STATUS_LONG: Record<LibraryKind, Record<LibraryStatus, string>> = {
  film: { planned: 'Ingin ditonton', active: 'Sedang ditonton', done: 'Sudah ditonton', dropped: 'Ditinggalkan' },
  buku: { planned: 'Ingin dibaca', active: 'Sedang dibaca', done: 'Selesai dibaca', dropped: 'Ditinggalkan' },
}
export const statusLabel = (kind: LibraryKind, status: LibraryStatus): string => STATUS_LONG[kind][status]

/** Short enough for a segmented control. */
export const STATUS_SHORT: Record<LibraryStatus, string> = { planned: 'Ingin', active: 'Sedang', done: 'Selesai', dropped: 'Berhenti' }

export const KIND_LABEL: Record<LibraryKind, string> = { film: 'Film', buku: 'Buku' }

/** 124 becomes "2 j 4 m", 180 becomes "3 j", 45 becomes "45 m". */
export function formatRuntime(minutes: number | undefined): string {
  if (!minutes || minutes < 1) return ''
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m} m`
  return m === 0 ? `${h} j` : `${h} j ${m} m`
}

/** The people behind an item, in one line: the director of a film, the authors of a book. */
export const creditOf = (item: LibraryItem): string => (item.kind === 'film' ? (item.director ?? '') : (item.authors ?? []).join(', '))

/** "2023 · 3 j · Drama, Sejarah" with whatever of it is known. */
export function metaLine(item: LibraryItem): string {
  const parts: string[] = []
  if (item.year) parts.push(String(item.year))
  if (item.kind === 'film') {
    const runtime = formatRuntime(item.runtimeMin)
    if (runtime) parts.push(runtime)
  } else if (item.pages) {
    parts.push(`${item.pages} hlm`)
  }
  if (item.genres.length) parts.push(item.genres.slice(0, 2).join(', '))
  return parts.join(' · ')
}

// ---------------------------------------------------------------------------------------------
// The cover that is drawn when there is no picture
// ---------------------------------------------------------------------------------------------

const ACCENTS: CategoryColor[] = ['moss', 'ochre', 'clay', 'teal', 'slate', 'rosewood']

/** The same title always gets the same colour, so a shelf does not change from one visit to the next. */
export function accentFor(title: string): CategoryColor {
  let hash = 0
  for (const ch of normalizeTitle(title)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return ACCENTS[hash % ACCENTS.length]
}

export const accentOf = (item: Pick<LibraryItem, 'accent' | 'title'>): CategoryColor => item.accent ?? accentFor(item.title)

// ---------------------------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------------------------

export interface Progress {
  page: number
  pages: number
  /** Whole percent, 0 to 100. */
  percent: number
}

/** How far into a book. Null for a film, or for a book whose length is not known. */
export function progressOf(item: Pick<LibraryItem, 'kind' | 'pages' | 'currentPage'>): Progress | null {
  if (item.kind !== 'buku' || !item.pages || item.pages < 1) return null
  const page = Math.max(0, Math.min(item.pages, Math.round(item.currentPage ?? 0)))
  return { page, pages: item.pages, percent: Math.round((page / item.pages) * 100) }
}

// ---------------------------------------------------------------------------------------------
// Looking for things: filters, sorting, and the URL they live in
// ---------------------------------------------------------------------------------------------

export type LibraryTab = 'semua' | 'film' | 'buku'
export type LibrarySort = 'terbaru' | 'judul' | 'rating' | 'tahun'
export type LibraryView = 'rak' | 'daftar'
export type StatusFilter = LibraryStatus | 'semua'

export interface LibraryFilters {
  tab: LibraryTab
  status: StatusFilter
  genre: string
  /** Minimum rating in half-stars, 0 for any. */
  minRating: number
  q: string
  sort: LibrarySort
  view: LibraryView
}

export const DEFAULT_FILTERS: LibraryFilters = { tab: 'semua', status: 'semua', genre: '', minRating: 0, q: '', sort: 'terbaru', view: 'rak' }

const oneOf = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T => (allowed.includes(value as T) ? (value as T) : fallback)

/** Reads filters from the address. Anything unknown or out of range falls back to the default, so a stale link never breaks the page. */
export function parseFilters(params: URLSearchParams): LibraryFilters {
  const minRating = Number(params.get('rating'))
  return {
    tab: oneOf(params.get('tab'), ['semua', 'film', 'buku'] as const, DEFAULT_FILTERS.tab),
    status: oneOf(params.get('status'), ['semua', ...STATUSES] as const, DEFAULT_FILTERS.status),
    genre: params.get('genre') ?? '',
    minRating: Number.isInteger(minRating) && minRating >= RATING_MIN && minRating <= RATING_MAX ? minRating : 0,
    q: params.get('q') ?? '',
    sort: oneOf(params.get('urut'), ['terbaru', 'judul', 'rating', 'tahun'] as const, DEFAULT_FILTERS.sort),
    view: oneOf(params.get('tampilan'), ['rak', 'daftar'] as const, DEFAULT_FILTERS.view),
  }
}

/** The inverse of `parseFilters`. Values equal to their default are left out, so the plain page has a plain address. */
export function filtersToParams(filters: LibraryFilters): Record<string, string> {
  const out: Record<string, string> = {}
  if (filters.tab !== DEFAULT_FILTERS.tab) out.tab = filters.tab
  if (filters.status !== DEFAULT_FILTERS.status) out.status = filters.status
  if (filters.genre) out.genre = filters.genre
  if (filters.minRating) out.rating = String(filters.minRating)
  if (filters.q.trim()) out.q = filters.q
  if (filters.sort !== DEFAULT_FILTERS.sort) out.urut = filters.sort
  if (filters.view !== DEFAULT_FILTERS.view) out.tampilan = filters.view
  return out
}

/** True when anything narrows the list beyond the tab. */
export const isNarrowed = (f: LibraryFilters): boolean => f.status !== 'semua' || f.genre !== '' || f.minRating > 0 || f.q.trim() !== ''

/** Lowercase, no accents, no punctuation, single spaces. How two spellings of one title are made to meet. */
export function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const searchText = (item: LibraryItem): string =>
  normalizeTitle(
    [item.title, item.originalTitle, item.director, ...(item.authors ?? []), ...(item.cast ?? []).map((c) => c.name), ...item.genres, ...item.tags]
      .filter(Boolean)
      .join(' '),
  )

/** Every word of the query has to be found somewhere in the item. */
export function matchesQuery(item: LibraryItem, query: string): boolean {
  const words = normalizeTitle(query).split(' ').filter(Boolean)
  if (words.length === 0) return true
  const text = searchText(item)
  return words.every((w) => text.includes(w))
}

export function applyFilters(items: readonly LibraryItem[], f: LibraryFilters): LibraryItem[] {
  return items.filter(
    (item) =>
      (f.tab === 'semua' || item.kind === f.tab) &&
      (f.status === 'semua' || item.status === f.status) &&
      (!f.genre || item.genres.includes(f.genre)) &&
      (f.minRating === 0 || (item.rating ?? 0) >= f.minRating) &&
      matchesQuery(item, f.q),
  )
}

/** When something last mattered: the day it was finished, otherwise the day it was added. */
const recency = (item: LibraryItem): string => item.finishedAt ?? item.createdAt.slice(0, 10)

export function sortItems(items: readonly LibraryItem[], sort: LibrarySort): LibraryItem[] {
  const byTitle = (a: LibraryItem, b: LibraryItem) => a.title.localeCompare(b.title, 'id')
  const list = [...items]
  switch (sort) {
    case 'judul':
      return list.sort(byTitle)
    case 'rating':
      // Unrated items go last, not first, however the ratings compare.
      return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || byTitle(a, b)).sort((a, b) => Number(a.rating === undefined) - Number(b.rating === undefined))
    case 'tahun':
      return list.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || byTitle(a, b))
    case 'terbaru':
    default:
      return list.sort((a, b) => recency(b).localeCompare(recency(a)) || a.order - b.order || byTitle(a, b))
  }
}

/** Every genre in use, alphabetically, for the filter. */
export const genresOf = (items: readonly LibraryItem[]): string[] => [...new Set(items.flatMap((i) => i.genres))].sort((a, b) => a.localeCompare(b, 'id'))

/** What is being watched or read right now, the most recently touched first. */
export const inProgress = (items: readonly LibraryItem[]): LibraryItem[] =>
  items.filter((i) => i.status === 'active').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

// ---------------------------------------------------------------------------------------------
// Adding: is this already here?
// ---------------------------------------------------------------------------------------------

const digits = (isbn: string | undefined) => (isbn ?? '').replace(/[^0-9Xx]/g, '').toUpperCase()

interface DuplicateProbe {
  kind: LibraryKind
  title: string
  year?: number
  isbn?: string
  authors?: string[]
}

/**
 * An item the person already has that looks like the one being added. A film matches on title, and on year too when both
 * have one. A book matches on ISBN, or on title and first author. `ignoreId` keeps an item from matching itself while editing.
 */
export function findDuplicate(items: readonly LibraryItem[], probe: DuplicateProbe, ignoreId?: string): LibraryItem | undefined {
  const title = normalizeTitle(probe.title)
  if (!title) return undefined
  return items.find((item) => {
    if (item.id === ignoreId || item.kind !== probe.kind) return false
    if (probe.kind === 'film') return normalizeTitle(item.title) === title && (!item.year || !probe.year || item.year === probe.year)
    const isbn = digits(probe.isbn)
    if (isbn.length >= 10 && isbn === digits(item.isbn)) return true
    const author = normalizeTitle(probe.authors?.[0] ?? '')
    const theirs = normalizeTitle(item.authors?.[0] ?? '')
    return normalizeTitle(item.title) === title && (!author || !theirs || author === theirs)
  })
}

// ---------------------------------------------------------------------------------------------
// The strip of numbers on the hub
// ---------------------------------------------------------------------------------------------

export interface LibrarySummary {
  filmsThisYear: number
  booksThisYear: number
  pagesThisYear: number
  /** Mean of every rating, in stars, or null when nothing is rated. */
  averageStars: number | null
}

export function summarize(items: readonly LibraryItem[], year: number): LibrarySummary {
  const finishedThisYear = items.filter((i) => i.status === 'done' && i.finishedAt?.startsWith(String(year)))
  const books = finishedThisYear.filter((i) => i.kind === 'buku')
  const rated = items.filter((i) => i.rating !== undefined)
  return {
    filmsThisYear: finishedThisYear.filter((i) => i.kind === 'film').length,
    booksThisYear: books.length,
    pagesThisYear: books.reduce((sum, b) => sum + (b.pages ?? 0), 0),
    averageStars: rated.length === 0 ? null : rated.reduce((sum, i) => sum + (i.rating as number), 0) / rated.length / 2,
  }
}

/** Splits "Drama, Sejarah" into ["Drama", "Sejarah"]: commas or new lines, trimmed, empties and repeats dropped. */
export function splitList(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of text.split(/[,\n]/)) {
    const value = part.trim()
    const key = value.toLowerCase()
    if (value && !seen.has(key)) {
      seen.add(key)
      out.push(value)
    }
  }
  return out
}

/** The first two letters of a person's name, for the round stand-in where a photo would go. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0]).toUpperCase()
}

/** Where to put a new item so it lands after the others of its kind. */
export const appendOrder = (items: readonly LibraryItem[], kind: LibraryKind): number =>
  items.filter((i) => i.kind === kind).reduce((max, i) => Math.max(max, i.order), 0) + 1000
