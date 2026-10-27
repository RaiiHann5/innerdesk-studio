import { isoDay } from '@/lib/date'
import { splitList } from '@/lib/library'
import type { CastMember, CategoryColor, CrewMember, LibraryItem, LibraryKind, LibraryStatus, NewEntity } from '@/types/domain'

export interface PersonRow {
  name: string
  /** The character for cast, the job for crew. */
  detail: string
}

/** The form as text. Everything is a string until `buildInput` checks it, so a half-typed number is never lost. */
export interface Draft {
  title: string
  originalTitle: string
  year: string
  status: LibraryStatus
  genres: string
  tags: string
  synopsis: string
  coverUrl: string
  accent: CategoryColor | undefined
  // Film
  director: string
  runtime: string
  cast: PersonRow[]
  crew: PersonRow[]
  // Buku
  authors: string
  pages: string
  currentPage: string
  publisher: string
  isbn: string
  format: '' | 'cetak' | 'ebook' | 'audio'
}

export const emptyDraft = (): Draft => ({
  title: '',
  originalTitle: '',
  year: '',
  status: 'planned',
  genres: '',
  tags: '',
  synopsis: '',
  coverUrl: '',
  accent: undefined,
  director: '',
  runtime: '',
  cast: [],
  crew: [],
  authors: '',
  pages: '',
  currentPage: '',
  publisher: '',
  isbn: '',
  format: '',
})

export const draftFromItem = (item: LibraryItem): Draft => ({
  title: item.title,
  originalTitle: item.originalTitle ?? '',
  year: item.year ? String(item.year) : '',
  status: item.status,
  genres: item.genres.join(', '),
  tags: item.tags.join(', '),
  synopsis: item.synopsis ?? '',
  coverUrl: item.coverUrl ?? '',
  accent: item.accent,
  director: item.director ?? '',
  runtime: item.runtimeMin ? String(item.runtimeMin) : '',
  cast: (item.cast ?? []).map((c) => ({ name: c.name, detail: c.character ?? '' })),
  crew: (item.crew ?? []).map((c) => ({ name: c.name, detail: c.job })),
  authors: (item.authors ?? []).join(', '),
  pages: item.pages ? String(item.pages) : '',
  currentPage: item.currentPage !== undefined ? String(item.currentPage) : '',
  publisher: item.publisher ?? '',
  isbn: item.isbn ?? '',
  format: item.format ?? '',
})

export type BuildResult = { ok: true; value: Omit<NewEntity<LibraryItem>, 'order'> } | { ok: false; error: string; field: keyof Draft }

const blank = (text: string) => text.trim() || undefined

/** A whole number in [min, max], or undefined for an empty field, or null when what was typed is not that. */
function whole(text: string, min: number, max: number): number | undefined | null {
  const t = text.trim()
  if (!t) return undefined
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  return n >= min && n <= max ? n : null
}

const isWebUrl = (text: string) => {
  try {
    const u = new URL(text)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

const isbnDigits = (text: string) => text.replace(/[\s-]/g, '')

/** Checks the draft and turns it into what is stored. The first problem found is reported, with the field it belongs to. */
export function buildInput(draft: Draft, kind: LibraryKind): BuildResult {
  const fail = (field: keyof Draft, error: string): BuildResult => ({ ok: false, field, error })
  const title = draft.title.trim()
  if (!title) return fail('title', 'Judul wajib diisi.')

  const year = whole(draft.year, 1800, 2100)
  if (year === null) return fail('year', 'Tahun harus antara 1800 dan 2100.')
  const coverUrl = blank(draft.coverUrl)
  if (coverUrl && !isWebUrl(coverUrl)) return fail('coverUrl', 'Tautan sampul harus diawali http:// atau https://.')

  const common = {
    kind,
    title,
    originalTitle: blank(draft.originalTitle),
    year,
    status: draft.status,
    genres: splitList(draft.genres),
    tags: splitList(draft.tags),
    synopsis: blank(draft.synopsis),
    coverUrl,
    accent: draft.accent,
  }
  const finishedAt = draft.status === 'done' ? isoDay(0) : undefined

  if (kind === 'film') {
    const runtimeMin = whole(draft.runtime, 1, 1000)
    if (runtimeMin === null) return fail('runtime', 'Durasi harus bilangan bulat dalam menit.')
    const cast: CastMember[] = draft.cast.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), ...(r.detail.trim() ? { character: r.detail.trim() } : {}) }))
    const crew: CrewMember[] = draft.crew.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), job: r.detail.trim() || 'Kru' }))
    return { ok: true, value: { ...common, finishedAt, director: blank(draft.director), runtimeMin, cast, crew } }
  }

  const pages = whole(draft.pages, 1, 20000)
  if (pages === null) return fail('pages', 'Jumlah halaman harus bilangan bulat.')
  const typedPage = whole(draft.currentPage, 0, 20000)
  if (typedPage === null) return fail('currentPage', 'Halaman saat ini harus bilangan bulat.')
  if (pages !== undefined && typedPage !== undefined && typedPage > pages) return fail('currentPage', 'Halaman saat ini tidak boleh melebihi jumlah halaman.')
  const isbn = blank(draft.isbn)
  if (isbn && !/^(\d{9}[\dXx]|\d{13})$/.test(isbnDigits(isbn))) return fail('isbn', 'ISBN harus 10 atau 13 digit.')
  const authors = splitList(draft.authors)
  // A finished book has been read to its last page, whatever was typed.
  const currentPage = draft.status === 'done' && pages !== undefined ? pages : typedPage
  return { ok: true, value: { ...common, finishedAt, authors, pages, currentPage, publisher: blank(draft.publisher), isbn, format: draft.format || undefined } }
}
