import { Link } from 'react-router-dom'
import { Bookmark, Check, Heart, Play, Prohibit } from '@phosphor-icons/react'
import { IconButton } from '@/components/ui/IconButton'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { cn } from '@/lib/cn'
import { STATUSES, creditOf, metaLine, progressOf, statusLabel } from '@/lib/library'
import type { LibraryItem, LibraryStatus } from '@/types/domain'
import { CoverImage } from '../CoverImage'
import { setFavorite, setStatus } from '../libraryActions'
import { detailPath } from '../libraryUi'
import { RatingDisplay } from '../RatingStars'

const STATUS_ICON = { planned: Bookmark, active: Play, done: Check, dropped: Prohibit } as const

/**
 * One item on the shelf. The cover is the card. The quick actions sit over its corner and appear on hover and on keyboard
 * focus alike, and always on a touch screen, which has no hover. They take no room, so nothing moves when they appear.
 */
export function LibraryCard({ item }: { item: LibraryItem }) {
  const progress = item.status === 'active' ? progressOf(item) : null
  const items: MenuItem[] = STATUSES.map((status: LibraryStatus) => ({
    label: statusLabel(item.kind, status),
    icon: STATUS_ICON[status],
    onSelect: () => void setStatus(item, status),
  }))

  return (
    <li className="group relative">
      <Link to={detailPath(item)} viewTransition className="block rounded-[4px] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-text">
        <div className="relative">
          <CoverImage item={item} transitionName={`cover-${item.id}`} className="transition-shadow duration-base group-hover:shadow-lift group-focus-within:shadow-lift" />
          {progress && (
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-ink/15">
              <span className="block h-full bg-accent" style={{ width: `${progress.percent}%` }} />
            </span>
          )}
        </div>
        <h3 className="mt-2 line-clamp-2 font-medium leading-snug">{item.title}</h3>
        <p className="truncate text-xs text-muted">{creditOf(item) || metaLine(item) || '\u00a0'}</p>
        <p className="mt-1 flex min-h-5 items-center gap-2 text-xs text-muted">
          {item.rating !== undefined ? <RatingDisplay rating={item.rating} size={13} /> : <span>{statusLabel(item.kind, item.status)}</span>}
          {progress && <span className="font-mono tabular-nums">{progress.percent}%</span>}
        </p>
      </Link>

      <div
        className={cn(
          'absolute right-1.5 top-1.5 flex items-center rounded-control border bg-surface/95 opacity-0 transition-opacity duration-fast',
          'group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100',
        )}
      >
        <IconButton
          icon={Heart}
          weight={item.favorite ? 'fill' : 'regular'}
          label={item.favorite ? `Hapus ${item.title} dari favorit` : `Jadikan ${item.title} favorit`}
          aria-pressed={Boolean(item.favorite)}
          onClick={() => void setFavorite(item, !item.favorite)}
          className={cn(item.favorite && 'text-accent')}
        />
        <Menu label={`Ubah status ${item.title}`} items={items} />
      </div>
    </li>
  )
}
