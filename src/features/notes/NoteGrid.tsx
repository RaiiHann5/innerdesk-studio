import { useRef, type KeyboardEvent } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/cn'
import type { Note } from '@/types/domain'
import { NoteCard } from './NoteCard'

/** One column on a phone, two on a tablet, three once the page is wide enough to hold them beside the sidebar. */
const GRID_CLASS = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'

const LINK = 'a[data-note-link]'

/** Moves focus to the first card. Used by the search field's arrow down. */
export const focusFirstNote = () => document.querySelector<HTMLAnchorElement>(LINK)?.focus()

/** The card to move to from `index` for an arrow key: along the reading order, or to the nearest card in the next row. */
function target(cards: HTMLElement[], index: number, key: string): number | undefined {
  const last = cards.length - 1
  if (key === 'ArrowRight') return Math.min(index + 1, last)
  if (key === 'ArrowLeft') return Math.max(index - 1, 0)
  if (key === 'Home') return 0
  if (key === 'End') return last
  if (key !== 'ArrowDown' && key !== 'ArrowUp') return undefined

  const direction = key === 'ArrowDown' ? 1 : -1
  const { offsetTop: top, offsetLeft: left } = cards[index]
  const other = cards.map((card, i) => ({ i, top: card.offsetTop, left: card.offsetLeft })).filter((c) => direction * (c.top - top) > 0)
  if (other.length === 0) return index
  const rowTop = direction > 0 ? Math.min(...other.map((c) => c.top)) : Math.max(...other.map((c) => c.top))
  return other.filter((c) => c.top === rowTop).reduce((best, c) => (Math.abs(c.left - left) < Math.abs(best.left - left) ? c : best)).i
}

export function NoteGrid({ notes, pending }: { notes: Note[]; pending: boolean }) {
  const ref = useRef<HTMLUListElement>(null)

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const links = Array.from(ref.current?.querySelectorAll<HTMLAnchorElement>(LINK) ?? [])
    const index = links.indexOf(document.activeElement as HTMLAnchorElement)
    if (index === -1) return
    const next = target(
      links.map((link) => link.closest('li') as HTMLElement),
      index,
      e.key,
    )
    if (next === undefined) return
    e.preventDefault()
    links[next].focus()
  }

  return (
    <ul ref={ref} onKeyDown={onKeyDown} className={cn(GRID_CLASS, 'transition-opacity duration-fast', pending && 'opacity-60')}>
      {notes.map((note) => (
        <li key={note.id} className="min-w-0">
          <NoteCard note={note} to={`/notes/${note.id}`} />
        </li>
      ))}
    </ul>
  )
}

/** Placeholder cards in the same grid, so the page does not jump when the notes arrive. */
export function NoteGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={GRID_CLASS}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-[200px] rounded-card" />
      ))}
    </div>
  )
}
