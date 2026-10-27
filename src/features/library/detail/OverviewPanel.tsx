import { cn } from '@/lib/cn'
import { accentOf, formatRuntime, initialsOf } from '@/lib/library'
import type { LibraryItem } from '@/types/domain'
import { ACCENT } from '../libraryUi'

/** A list of labelled facts set the way a book's colophon or a film's credits are: label small on the left, value on the right. */
function Colophon({ rows }: { rows: Array<[label: string, value: string, mono?: boolean]> }) {
  const present = rows.filter(([, value]) => value)
  if (present.length === 0) return null
  return (
    <dl className="divide-y rounded-card border bg-surface text-sm">
      {present.map(([label, value, mono]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 px-3 py-2">
          <dt className="shrink-0 text-xs text-muted">{label}</dt>
          <dd className={cn('min-w-0 text-right', mono && 'font-mono text-xs tabular-nums')}>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

const FORMAT_LABEL = { cetak: 'Cetak', ebook: 'E-book', audio: 'Audio' } as const

export function OverviewPanel({ item }: { item: LibraryItem }) {
  const accent = ACCENT[accentOf(item)]
  const cast = item.cast ?? []
  const crew = item.crew ?? []

  const rows: Array<[string, string, boolean?]> =
    item.kind === 'film'
      ? [
          ['Sutradara', item.director ?? ''],
          ['Tahun', item.year ? String(item.year) : '', true],
          ['Durasi', formatRuntime(item.runtimeMin), true],
          ['Genre', item.genres.join(', ')],
          ...crew.map((c): [string, string] => [c.job, c.name]),
        ]
      : [
          ['Penulis', (item.authors ?? []).join(', ')],
          ['Penerbit', item.publisher ?? ''],
          ['Tahun', item.year ? String(item.year) : '', true],
          ['Halaman', item.pages ? String(item.pages) : '', true],
          ['Format', item.format ? FORMAT_LABEL[item.format] : ''],
          ['ISBN', item.isbn ?? '', true],
          ['Genre', item.genres.join(', ')],
        ]

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-6">
        <section aria-labelledby="library-synopsis" className="space-y-2">
          <h2 id="library-synopsis" className="text-sm font-medium text-muted">
            Sinopsis
          </h2>
          {item.synopsis ? <p className="max-w-[62ch] font-serif text-md leading-relaxed">{item.synopsis}</p> : <p className="text-sm text-muted">Belum ada sinopsis. Tambahkan lewat menu Ubah.</p>}
        </section>

        {item.kind === 'film' && cast.length > 0 && (
          <section aria-labelledby="library-cast" className="space-y-2">
            <h2 id="library-cast" className="text-sm font-medium text-muted">
              Pemeran utama
            </h2>
            <ul tabIndex={0} aria-labelledby="library-cast" className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2 outline-offset-4">
              {cast.map((person) => (
                <li key={person.name} className="w-28 shrink-0 snap-start">
                  <span aria-hidden className={cn('grid size-14 place-items-center rounded-full font-display text-md font-bold', accent.tint, accent.text)}>
                    {initialsOf(person.name)}
                  </span>
                  <p className="mt-2 text-sm font-medium leading-snug">{person.name}</p>
                  {person.character && <p className="line-clamp-2 text-xs text-muted">{person.character}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {item.tags.length > 0 && (
          <ul aria-label="Tag" className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <li key={tag} className="rounded-chip bg-sunken px-2 py-0.5 text-xs text-muted">
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside aria-label="Rincian">
        <Colophon rows={rows} />
      </aside>
    </div>
  )
}
