import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { Eye, PencilSimple } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Switch } from '@/components/ui/Switch'
import type { LibraryItem, NoteContent } from '@/types/domain'
import { saveReview, setSpoilers } from '../libraryActions'

const ReviewEditor = lazy(() => import('./ReviewEditor'))

type SaveState = 'idle' | 'saving' | 'saved'
const SAVE_DELAY_MS = 700

/**
 * The person's own review. Reading and writing are two states of one panel. Writing saves by itself a moment after the last
 * keystroke, and once more when the panel is left. A review marked as having spoilers stays blurred until it is asked for.
 */
export function ReviewPanel({ item }: { item: LibraryItem }) {
  const [editing, setEditing] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [state, setState] = useState<SaveState>('idle')
  const pending = useRef<{ content: NoteContent; excerpt: string } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const itemRef = useRef(item)
  itemRef.current = item

  const hasReview = Boolean(item.reviewExcerpt?.trim())
  const hidden = Boolean(item.reviewHasSpoilers) && !revealed && !editing && hasReview

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current)
    const next = pending.current
    if (!next) return
    pending.current = null
    setState('saving')
    const ok = await saveReview(itemRef.current, next.content, next.excerpt)
    setState(ok ? 'saved' : 'idle')
  }, [])

  // Leaving the page with an unsaved sentence must not lose it.
  useEffect(() => () => void flush(), [flush])

  const onChange = (content: NoteContent, excerpt: string) => {
    pending.current = { content, excerpt }
    setState('saving')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS)
  }

  const finish = async () => {
    await flush()
    setEditing(false)
    setState('idle')
  }

  return (
    <section aria-labelledby="library-review" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="library-review" className="text-md font-bold">
          Ulasanku
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span id="library-spoiler" className="text-sm text-muted">
              Mengandung spoiler
            </span>
            <Switch checked={Boolean(item.reviewHasSpoilers)} onChange={(on) => void setSpoilers(item, on)} labelledBy="library-spoiler" />
          </div>
          {editing ? (
            <Button variant="primary" onClick={() => void finish()}>
              Selesai
            </Button>
          ) : (
            <Button onClick={() => (setRevealed(true), setEditing(true))}>
              <PencilSimple aria-hidden />
              {hasReview ? 'Ubah ulasan' : 'Tulis ulasan'}
            </Button>
          )}
        </div>
      </div>

      {!hasReview && !editing ? (
        <p className="max-w-[62ch] font-serif text-md leading-relaxed text-muted">Belum ada ulasan. Tulis apa yang kamu rasakan selagi masih segar: apa yang paling menempel, dan apa yang akan kamu ingat lima tahun lagi.</p>
      ) : (
        <div className="relative">
          <div aria-hidden={hidden || undefined} className={hidden ? 'pointer-events-none select-none blur-sm' : undefined}>
            <Suspense fallback={<Skeleton className="h-24 max-w-[62ch]" />}>
              <ReviewEditor key={editing ? 'edit' : 'read'} content={item.review} editable={editing} label={`Ulasan ${item.title}`} onChange={onChange} />
            </Suspense>
          </div>
          {hidden && (
            <div className="absolute inset-0 grid place-items-center">
              <Button variant="primary" onClick={() => setRevealed(true)}>
                <Eye aria-hidden />
                Tampilkan ulasan (mengandung spoiler)
              </Button>
            </div>
          )}
        </div>
      )}

      {editing && (
        <p role="status" className="text-xs text-muted">
          {state === 'saving' ? 'Menyimpan…' : state === 'saved' ? 'Tersimpan' : 'Tersimpan otomatis saat kamu berhenti mengetik.'}
        </p>
      )}
    </section>
  )
}
