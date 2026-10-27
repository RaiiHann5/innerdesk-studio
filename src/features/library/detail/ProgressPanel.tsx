import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { controlClass } from '@/components/ui/Field'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/cn'
import { progressOf } from '@/lib/library'
import type { LibraryItem } from '@/types/domain'
import { setProgress } from '../libraryActions'

/** How far into the book, with a box to move it. Reaching the last page marks the book finished. */
export function ProgressPanel({ item }: { item: LibraryItem }) {
  const progress = progressOf(item)
  if (!progress) {
    return <p className="text-sm text-muted">Isi jumlah halaman lewat menu Ubah untuk melacak progres baca.</p>
  }
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs text-muted">Progres baca</p>
        <p className="font-mono text-sm tabular-nums">
          {progress.page} / {progress.pages} hlm · {progress.percent}%
        </p>
      </div>
      <ProgressBar value={progress.percent} label={`Progres baca ${item.title}`} />
      {/* Keyed by the page, so a change made elsewhere puts the new number in the box. */}
      <PageForm key={progress.page} item={item} page={progress.page} pages={progress.pages} />
    </div>
  )
}

function PageForm({ item, page, pages }: { item: LibraryItem; page: number; pages: number }) {
  const [text, setText] = useState(String(page))
  const value = Number(text)
  const valid = /^\d+$/.test(text.trim()) && value <= pages
  const changed = valid && value !== page

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (changed) void setProgress(item, value)
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <label htmlFor="library-page" className="text-sm text-muted">
        Sampai halaman
      </label>
      <input
        id="library-page"
        inputMode="numeric"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-invalid={!valid || undefined}
        className={cn(controlClass, 'w-24 font-mono tabular-nums')}
      />
      <Button type="submit" disabled={!changed}>
        Perbarui
      </Button>
      {!valid && <span className="text-xs text-status-overdue">Antara 0 dan {pages}.</span>}
    </form>
  )
}
