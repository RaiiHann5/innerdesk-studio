import { useState, type FormEvent } from 'react'
import { Copy, Plus, Quotes, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, controlClass } from '@/components/ui/Field'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'
import { useLibraryQuoteStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { LibraryItem } from '@/types/domain'
import { addQuote, removeQuoteWithUndo } from '../libraryActions'

const QUOTE_MAX = 600

/** Scenes for a film, passages for a book: the lines and moments worth keeping, with where to find them again. */
export function QuotesPanel({ item }: { item: LibraryItem }) {
  const all = useLibraryQuoteStore((s) => s.items)
  const quotes = all.filter((q) => q.itemId === item.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const [adding, setAdding] = useState(false)
  const film = item.kind === 'film'

  return (
    <section aria-labelledby="library-quotes" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="library-quotes" className="text-md font-bold">
          {film ? 'Adegan & kutipan' : 'Kutipan & sorotan'}
        </h2>
        {!adding && (
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden />
            {film ? 'Tambah adegan' : 'Tambah kutipan'}
          </Button>
        )}
      </div>

      {adding && <QuoteForm item={item} onDone={() => setAdding(false)} />}

      {quotes.length === 0 && !adding ? (
        <EmptyState icon={Quotes} title="Belum ada yang disimpan" description={film ? 'Catat adegan atau dialog yang ingin kamu ingat, lengkap dengan menit berapa.' : 'Simpan kalimat atau bagian yang ingin kamu baca lagi, lengkap dengan halamannya.'} />
      ) : (
        <ul className="space-y-3">
          {quotes.map((quote) => (
            <li key={quote.id} className="group rounded-card border bg-surface p-4">
              <blockquote className="border-l-2 border-accent pl-4">
                <p className="whitespace-pre-wrap font-serif text-md leading-relaxed">{quote.text}</p>
                {quote.locator && <footer className="mt-1.5 font-mono text-xs text-muted">{quote.locator}</footer>}
              </blockquote>
              {quote.comment && <p className="mt-3 text-sm text-muted">{quote.comment}</p>}
              <div className="mt-2 flex justify-end gap-1">
                <IconButton
                  icon={Copy}
                  label="Salin kutipan"
                  onClick={() => {
                    void navigator.clipboard?.writeText(quote.text).then(
                      () => useUiStore.getState().showToast('Kutipan disalin'),
                      () => useUiStore.getState().showToast('Gagal menyalin'),
                    )
                  }}
                />
                <IconButton icon={Trash} label="Hapus kutipan" onClick={() => void removeQuoteWithUndo(quote)} className="hover:text-status-overdue" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function QuoteForm({ item, onDone }: { item: LibraryItem; onDone: () => void }) {
  const film = item.kind === 'film'
  const [text, setText] = useState('')
  const [locator, setLocator] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return setError(film ? 'Tulis adegan atau dialognya dulu.' : 'Tulis kutipannya dulu.')
    const ok = await addQuote({ itemId: item.id, text: text.trim(), locator: locator.trim() || undefined, comment: comment.trim() || undefined })
    if (ok) onDone()
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-card border bg-surface p-4">
      <Field label={film ? 'Adegan atau dialog' : 'Kutipan'} htmlFor="quote-text">
        <textarea
          id="quote-text"
          autoFocus
          rows={3}
          maxLength={QUOTE_MAX}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError(null)
          }}
          aria-invalid={error !== null || undefined}
          aria-describedby={error ? 'quote-error' : undefined}
          className={cn(controlClass, 'h-auto resize-y py-1.5 font-serif leading-relaxed')}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <Field label={film ? 'Menit' : 'Halaman'} htmlFor="quote-locator">
          <input id="quote-locator" value={locator} onChange={(e) => setLocator(e.target.value)} placeholder={film ? '1:23:40' : 'hlm. 142'} className={cn(controlClass, 'font-mono')} />
        </Field>
        <Field label="Komentarku" htmlFor="quote-comment">
          <input id="quote-comment" value={comment} onChange={(e) => setComment(e.target.value)} className={controlClass} />
        </Field>
      </div>
      {error && (
        <p id="quote-error" role="alert" className="text-sm font-medium text-status-overdue">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button onClick={onDone}>Batal</Button>
        <Button type="submit" variant="primary">
          Simpan
        </Button>
      </div>
    </form>
  )
}
