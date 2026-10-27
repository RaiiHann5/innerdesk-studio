import { Link } from 'react-router-dom'
import { Heart } from '@phosphor-icons/react'
import { fmt } from '@/lib/date'
import { KIND_LABEL, creditOf, statusLabel } from '@/lib/library'
import type { LibraryItem } from '@/types/domain'
import { detailPath } from '../libraryUi'
import { RatingDisplay } from '../RatingStars'

/** The dense view: one line per item, for scanning a long list or comparing ratings. */
export function LibraryList({ items }: { items: LibraryItem[] }) {
  return (
    <div className="overflow-x-auto rounded-card border bg-surface">
      <table className="w-full text-left text-base">
        <caption className="sr-only">Daftar film dan buku</caption>
        <thead className="border-b text-xs text-muted">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">
              Judul
            </th>
            <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">
              Jenis
            </th>
            <th scope="col" className="hidden px-3 py-2 font-medium md:table-cell">
              Tahun
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Rating
            </th>
            <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">
              Status
            </th>
            <th scope="col" className="hidden px-3 py-2 font-medium lg:table-cell">
              Selesai
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-sunken/50">
              <td className="max-w-0 px-3 py-2">
                <Link to={detailPath(item)} viewTransition className="flex items-center gap-1.5 font-medium hover:underline">
                  <span className="truncate">{item.title}</span>
                  {item.favorite && <Heart size={12} weight="fill" aria-label="Favorit" className="shrink-0 text-accent" />}
                </Link>
                <span className="block truncate text-xs text-muted">{creditOf(item)}</span>
              </td>
              <td className="hidden px-3 py-2 text-muted sm:table-cell">{KIND_LABEL[item.kind]}</td>
              <td className="hidden px-3 py-2 font-mono tabular-nums text-muted md:table-cell">{item.year ?? ''}</td>
              <td className="whitespace-nowrap px-3 py-2">{item.rating !== undefined ? <RatingDisplay rating={item.rating} size={13} /> : <span className="text-faint">-</span>}</td>
              <td className="hidden px-3 py-2 text-muted sm:table-cell">{statusLabel(item.kind, item.status)}</td>
              <td className="hidden px-3 py-2 font-mono tabular-nums text-muted lg:table-cell">{item.finishedAt ? fmt(item.finishedAt, 'd MMM yyyy') : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
