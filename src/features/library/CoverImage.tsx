import { useState } from 'react'
import { cn } from '@/lib/cn'
import { accentOf, creditOf } from '@/lib/library'
import type { LibraryItem } from '@/types/domain'
import { ACCENT } from './libraryUi'

type Size = 'sm' | 'md' | 'lg'

/** A long title gets a smaller size so it stays on the cover instead of running off it. */
function titleClass(title: string, size: Size): string {
  const long = title.length > 28
  if (size === 'sm') return long ? 'text-xs' : 'text-sm'
  if (size === 'md') return long ? 'text-sm' : 'text-md'
  return long ? 'text-md' : 'text-lg'
}

interface CoverImageProps {
  item: Pick<LibraryItem, 'kind' | 'title' | 'accent' | 'coverUrl' | 'year' | 'director' | 'authors'>
  size?: Size
  className?: string
  /** Gives the cover a view-transition name, so it can travel from the shelf to the detail page. */
  transitionName?: string
}

/**
 * The cover, always 2:3. With a picture it is the picture; without one, or when the picture fails to load, it is drawn:
 * the title set in serif on paper tinted with the item's colour. A book has a spine down the left, a film a bar across the top.
 * The picture is decorative, since the title is always written next to it.
 */
export function CoverImage({ item, size = 'md', className, transitionName }: CoverImageProps) {
  const [failed, setFailed] = useState(false)
  const style = ACCENT[accentOf(item)]
  const showImage = Boolean(item.coverUrl) && !failed
  const credit = creditOf(item as LibraryItem)

  return (
    <div
      style={transitionName ? { viewTransitionName: transitionName } : undefined}
      className={cn('relative aspect-[2/3] w-full overflow-hidden rounded-[4px] bg-sunken ring-1 ring-inset ring-ink/10', className)}
    >
      {showImage ? (
        <img src={item.coverUrl} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        <div className={cn('flex size-full flex-col justify-between', style.tint, item.kind === 'buku' ? 'pl-[16%] pr-[8%] py-[10%]' : 'px-[9%] pb-[8%] pt-[14%]')}>
          {item.kind === 'buku' ? (
            <span aria-hidden className={cn('absolute inset-y-0 left-0 w-[7%]', style.bar)} />
          ) : (
            <span aria-hidden className={cn('absolute inset-x-0 top-0 h-[5%]', style.bar)} />
          )}
          <span aria-hidden className="font-mono text-xs uppercase tracking-widest text-muted">
            {item.kind === 'buku' ? 'Buku' : 'Film'}
          </span>
          <span className={cn('font-serif font-medium leading-tight text-ink [text-wrap:balance]', titleClass(item.title, size))}>{item.title}</span>
          <span aria-hidden className="min-w-0 font-mono text-xs leading-snug text-muted">
            <span className="block truncate">{credit}</span>
            {item.year && <span className="block">{item.year}</span>}
          </span>
        </div>
      )}
    </div>
  )
}
