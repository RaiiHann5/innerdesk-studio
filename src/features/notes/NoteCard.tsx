import { Link } from 'react-router-dom'
import { Archive, ArrowCounterClockwise, Clock, PushPin, PushPinSlash, Trash } from '@phosphor-icons/react'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { Pill } from '@/components/ui/Pill'
import { cn } from '@/lib/cn'
import { fmt, timeAgo } from '@/lib/date'
import { useProjectStore } from '@/stores/entities'
import type { Note } from '@/types/domain'
import { archiveNoteWithUndo, deleteNoteWithUndo, togglePin, unarchiveNote } from './actions'

const MAX_TAGS = 2

interface NoteCardProps {
  note: Note
  /** When set, the title becomes a link and the whole card is its target. */
  to?: string
  /** For the dashboard: no menu, a shorter excerpt and tighter padding. */
  compact?: boolean
}

function menuItems(note: Note): MenuItem[] {
  const remove: MenuItem = { label: 'Hapus', icon: Trash, tone: 'danger', onSelect: () => void deleteNoteWithUndo(note, () => undefined) }
  if (note.archivedAt) {
    return [{ label: 'Pulihkan', icon: ArrowCounterClockwise, onSelect: () => void unarchiveNote(note) }, remove]
  }
  return [
    { label: note.pinned ? 'Lepas sematan' : 'Sematkan', icon: note.pinned ? PushPinSlash : PushPin, onSelect: () => void togglePin(note) },
    { label: 'Arsipkan', icon: Archive, onSelect: () => void archiveNoteWithUndo(note) },
    remove,
  ]
}

export function NoteCard({ note, to, compact = false }: NoteCardProps) {
  const title = note.title.trim() || 'Tanpa judul'
  const projectName = useProjectStore((s) => (note.projectId ? s.items.find((p) => p.id === note.projectId)?.name : undefined))
  // The chip names where the note belongs: its project, else its first tag, else nothing.
  const label = projectName ?? note.tags[0]
  const footerTags = note.tags.filter((tag) => tag !== label).slice(0, MAX_TAGS)

  return (
    <article
      className={cn(
        'relative flex h-full flex-col rounded-card border bg-surface transition-colors duration-fast',
        compact ? 'p-4' : 'p-5',
        // The orange ring shows on the whole card when its link is reached by keyboard. The style is spelled out because tailwind-merge drops a bare `outline` next to `outline-2`.
        'has-[a:focus-visible]:[outline-style:solid] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent-text',
        to && 'hover:border-faint',
      )}
    >
      <div className="flex min-h-8 items-center justify-between gap-2">
        {label ? (
          <Pill className="min-w-0 max-w-[75%]">
            <span className="truncate">{label}</span>
          </Pill>
        ) : (
          <span />
        )}
        {!compact && <Menu label={`Menu untuk ${title}`} items={menuItems(note)} className="z-10 -mr-2" />}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <time dateTime={note.createdAt} className="text-xs tabular-nums text-muted">
          {fmt(note.createdAt, 'd MMM yyyy')}
        </time>
        {note.pinned && <PushPin size={14} weight="fill" role="img" aria-label="Disematkan" className="shrink-0 text-accent-text" />}
      </div>

      <h3 className="mt-1 line-clamp-2 font-ui text-md font-medium leading-snug">
        {to ? (
          <Link to={to} data-note-link className="outline-none after:absolute after:inset-0 after:rounded-card">
            {title}
          </Link>
        ) : (
          title
        )}
      </h3>
      <p className={cn('mt-2 text-sm text-muted', compact ? 'line-clamp-2' : 'line-clamp-3')}>{note.excerpt || 'Belum ada isi.'}</p>

      <footer className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs text-muted">
        <span className="min-w-0 truncate">{footerTags.join('  ·  ')}</span>
        <time dateTime={note.updatedAt} title={fmt(note.updatedAt, 'd MMM yyyy, HH.mm')} className="flex shrink-0 items-center gap-1 tabular-nums">
          <Clock size={14} aria-hidden />
          Diubah {timeAgo(note.updatedAt)}
        </time>
      </footer>
    </article>
  )
}
