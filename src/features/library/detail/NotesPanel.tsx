import { Link, useNavigate } from 'react-router-dom'
import { NotePencil, Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { timeAgo } from '@/lib/date'
import { useNoteStore } from '@/stores/entities'
import type { LibraryItem } from '@/types/domain'
import { startNoteAbout } from '../libraryActions'

/** Notes from the Catatan page that were started here. Longer thinking lives there; this is the way in and the way back. */
export function NotesPanel({ item }: { item: LibraryItem }) {
  const navigate = useNavigate()
  const all = useNoteStore((s) => s.items)
  const notes = all.filter((n) => n.libraryItemId === item.id && !n.archivedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  const write = async () => {
    const id = await startNoteAbout(item)
    if (id) navigate(`/notes/${id}`)
  }

  return (
    <section aria-labelledby="library-notes" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="library-notes" className="text-md font-bold">
          Catatan tertaut
        </h2>
        <Button onClick={() => void write()}>
          <Plus aria-hidden />
          Tulis catatan
        </Button>
      </div>
      {notes.length === 0 ? (
        <EmptyState icon={NotePencil} title="Belum ada catatan" description="Untuk pikiran yang lebih panjang dari sebuah ulasan. Catatannya tersimpan di halaman Catatan dan tetap terhubung ke sini." />
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li key={note.id}>
              <Link to={`/notes/${note.id}`} className="block rounded-card border bg-surface p-3 transition-colors duration-fast hover:border-faint">
                <p className="font-medium">{note.title || 'Tanpa judul'}</p>
                {note.excerpt && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{note.excerpt}</p>}
                <p className="mt-1 text-xs text-muted">{timeAgo(note.updatedAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
