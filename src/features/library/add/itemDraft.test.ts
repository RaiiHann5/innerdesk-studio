import { describe, expect, it } from 'vitest'
import type { LibraryItem } from '@/types/domain'
import { buildInput, draftFromItem, emptyDraft, type Draft } from './itemDraft'

const draft = (fields: Partial<Draft> = {}): Draft => ({ ...emptyDraft(), title: 'Judul', ...fields })
const ok = (d: Draft, kind: 'film' | 'buku') => {
  const result = buildInput(d, kind)
  if (!result.ok) throw new Error(result.error)
  return result.value
}
const error = (d: Draft, kind: 'film' | 'buku') => {
  const result = buildInput(d, kind)
  return result.ok ? null : { field: result.field, error: result.error }
}

describe('buildInput, in general', () => {
  it('needs a title', () => {
    expect(error(draft({ title: '   ' }), 'film')).toEqual({ field: 'title', error: 'Judul wajib diisi.' })
  })

  it('trims text, drops blanks and splits lists', () => {
    const v = ok(draft({ title: '  Amélie ', originalTitle: ' ', genres: 'Komedi, Romansa,, komedi', tags: 'paris\nklasik', synopsis: '  Cerita.  ' }), 'film')
    expect(v).toMatchObject({ title: 'Amélie', originalTitle: undefined, genres: ['Komedi', 'Romansa'], tags: ['paris', 'klasik'], synopsis: 'Cerita.' })
  })

  it('accepts a year in range, empty, and rejects the rest', () => {
    expect(ok(draft({ year: '2023' }), 'film').year).toBe(2023)
    expect(ok(draft({ year: '' }), 'film').year).toBeUndefined()
    for (const year of ['1700', '2101', '20x3', '-5', '19.5']) expect(error(draft({ year }), 'film')?.field).toBe('year')
  })

  it('accepts only web addresses for the cover', () => {
    expect(ok(draft({ coverUrl: 'https://example.com/a.jpg' }), 'film').coverUrl).toBe('https://example.com/a.jpg')
    for (const coverUrl of ['example.com/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'ftp://x/y']) expect(error(draft({ coverUrl }), 'film')?.field).toBe('coverUrl')
  })

  it('stamps today on an item added as finished, and on nothing else', () => {
    expect(ok(draft({ status: 'done' }), 'film').finishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(ok(draft({ status: 'active' }), 'film').finishedAt).toBeUndefined()
  })
})

describe('buildInput for a film', () => {
  it('reads the runtime and the people', () => {
    const v = ok(
      draft({
        director: ' Christopher Nolan ',
        runtime: '180',
        cast: [
          { name: 'Cillian Murphy', detail: 'Oppenheimer' },
          { name: '  ', detail: 'diabaikan' },
          { name: 'Emily Blunt', detail: '' },
        ],
        crew: [{ name: 'Hoyte van Hoytema', detail: '' }],
      }),
      'film',
    )
    expect(v).toMatchObject({ director: 'Christopher Nolan', runtimeMin: 180 })
    expect(v.cast).toEqual([{ name: 'Cillian Murphy', character: 'Oppenheimer' }, { name: 'Emily Blunt' }])
    expect(v.crew).toEqual([{ name: 'Hoyte van Hoytema', job: 'Kru' }])
  })

  it('rejects a runtime that is not whole minutes', () => {
    expect(error(draft({ runtime: '1h30' }), 'film')?.field).toBe('runtime')
    expect(error(draft({ runtime: '0' }), 'film')?.field).toBe('runtime')
  })

  it('leaves the book fields off a film', () => {
    expect(ok(draft({ pages: '300', authors: 'X' }), 'film')).not.toHaveProperty('pages')
  })
})

describe('buildInput for a book', () => {
  it('reads authors, pages and format', () => {
    const v = ok(draft({ authors: 'A, B', pages: '258', publisher: ' Faber ', format: 'cetak' }), 'buku')
    expect(v).toMatchObject({ authors: ['A', 'B'], pages: 258, publisher: 'Faber', format: 'cetak' })
  })

  it('does not accept a current page past the end', () => {
    expect(error(draft({ pages: '100', currentPage: '101' }), 'buku')?.field).toBe('currentPage')
    expect(ok(draft({ pages: '100', currentPage: '100' }), 'buku').currentPage).toBe(100)
  })

  it('takes a finished book to its last page', () => {
    expect(ok(draft({ pages: '300', currentPage: '12', status: 'done' }), 'buku').currentPage).toBe(300)
  })

  it('checks the ISBN however it is written', () => {
    for (const isbn of ['978-0-571-20399-2', '9780571203992', '0-571-20399-X', '0571203990']) expect(buildInput(draft({ isbn }), 'buku').ok).toBe(true)
    for (const isbn of ['12345', '978-0-571-20399', 'abcdefghij']) expect(error(draft({ isbn }), 'buku')?.field).toBe('isbn')
  })

  it('leaves the film fields off a book', () => {
    expect(ok(draft({ director: 'X', runtime: '90' }), 'buku')).not.toHaveProperty('director')
  })
})

describe('draftFromItem', () => {
  it('turns an item back into text that builds the same item', () => {
    const item: LibraryItem = {
      id: 'i',
      createdAt: '',
      updatedAt: '',
      kind: 'film',
      title: 'Oppenheimer',
      year: 2023,
      status: 'done',
      genres: ['Drama', 'Sejarah'],
      tags: ['biografi'],
      order: 1000,
      director: 'Christopher Nolan',
      runtimeMin: 180,
      cast: [{ name: 'Cillian Murphy', character: 'Oppenheimer' }],
      crew: [{ name: 'Hoyte van Hoytema', job: 'Sinematografi' }],
    }
    const v = ok(draftFromItem(item), 'film')
    expect(v).toMatchObject({ title: 'Oppenheimer', year: 2023, genres: ['Drama', 'Sejarah'], director: 'Christopher Nolan', runtimeMin: 180, cast: item.cast, crew: item.crew })
  })
})
