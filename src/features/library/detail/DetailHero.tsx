import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, PencilSimple, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { controlClass } from '@/components/ui/Field'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { cn } from '@/lib/cn'
import { isoDay } from '@/lib/date'
import { KIND_LABEL, accentOf, formatRuntime } from '@/lib/library'
import type { LibraryItem } from '@/types/domain'
import { ItemFormDialog } from '../add/ItemFormDialog'
import { CoverImage } from '../CoverImage'
import { deleteItemWithUndo, setFavorite, setFinishedAt, setRating } from '../libraryActions'
import { ACCENT } from '../libraryUi'
import { RatingInput } from '../RatingStars'
import { StatusControl } from '../StatusControl'
import { ProgressPanel } from './ProgressPanel'

/**
 * The top of a detail page: the cover, the title set large, who made it, and the three things the person changes most
 * often: their rating, where it stands, and (for a book) how far in. The tint behind it is the item's own colour, kept faint.
 */
export function DetailHero({ item }: { item: LibraryItem }) {
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const wash = ACCENT[accentOf(item)].wash

  const menu: MenuItem[] = [
    { label: 'Ubah', icon: PencilSimple, onSelect: () => setEditing(true) },
    { label: 'Hapus', icon: Trash, tone: 'danger', onSelect: () => setDeleting(true) },
  ]

  const credit = item.kind === 'film' ? (item.director ? `Sutradara ${item.director}` : '') : (item.authors ?? []).length ? `oleh ${(item.authors ?? []).join(', ')}` : ''
  const facts = [item.year && String(item.year), item.kind === 'film' ? formatRuntime(item.runtimeMin) : item.pages ? `${item.pages} hlm` : '', item.genres.slice(0, 3).join(', ')].filter(Boolean)

  return (
    <header className={cn('relative rounded-card border p-4 md:p-6', wash)}>
      <Menu label={`Menu untuk ${item.title}`} items={menu} className="absolute right-3 top-3" />

      <div className="grid gap-5 sm:grid-cols-[10rem_minmax(0,1fr)] md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
        <div className="mx-auto w-40 sm:w-full">
          <CoverImage item={item} size="lg" transitionName={`cover-${item.id}`} className="shadow-lift" />
        </div>

        <div className="min-w-0 space-y-4 pr-8">
          <div className="space-y-1.5">
            <p className="font-mono text-xs uppercase tracking-widest text-muted">{KIND_LABEL[item.kind]}</p>
            <h1 className="font-display text-xl font-bold leading-tight tracking-tight [text-wrap:balance]">{item.title}</h1>
            {item.originalTitle && <p className="font-serif text-md italic text-muted">{item.originalTitle}</p>}
            {credit && <p className="text-md">{credit}</p>}
            {facts.length > 0 && <p className="font-mono text-sm text-muted">{facts.join(' · ')}</p>}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs text-muted">Ratingku</p>
            <RatingInput value={item.rating} onChange={(next) => void setRating(item, next)} label={`Rating ${item.title}`} />
          </div>

          <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
            <StatusControl item={item} />
            {item.status === 'done' && (
              <div className="space-y-1">
                <label htmlFor="library-finished" className="block text-xs text-muted">
                  Selesai pada
                </label>
                <input
                  id="library-finished"
                  type="date"
                  max={isoDay(0)}
                  value={item.finishedAt ?? ''}
                  onChange={(e) => void setFinishedAt(item, e.target.value)}
                  className={cn(controlClass, 'w-40 tabular-nums')}
                />
              </div>
            )}
            <Button aria-pressed={Boolean(item.favorite)} onClick={() => void setFavorite(item, !item.favorite)} className="self-start">
              <Heart weight={item.favorite ? 'fill' : 'regular'} aria-hidden className={cn(item.favorite && 'text-accent')} />
              Favorit
            </Button>
          </div>

          {item.kind === 'buku' && <ProgressPanel item={item} />}
        </div>
      </div>

      <ItemFormDialog open={editing} item={item} onClose={() => setEditing(false)} />
      <ConfirmDialog
        open={deleting}
        label={`Hapus ${item.title}`}
        title={`Hapus “${item.title}”?`}
        description="Riwayat dan kutipannya ikut dihapus. Catatan yang kamu tulis tentangnya tetap ada. Kamu masih bisa mengurungkannya sebentar lewat notifikasi."
        confirmLabel="Hapus"
        destructive
        onConfirm={() => {
          void deleteItemWithUndo(item).then((ok) => ok && navigate('/library', { replace: true }))
        }}
        onClose={() => setDeleting(false)}
      />
    </header>
  )
}
