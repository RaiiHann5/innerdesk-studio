import { useState, type FormEvent } from 'react'
import { ClockCounterClockwise, Plus, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, controlClass } from '@/components/ui/Field'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'
import { fmt, isoDay } from '@/lib/date'
import { useLibraryLogStore } from '@/stores/entities'
import type { LibraryItem, LibraryLog } from '@/types/domain'
import { addLog, removeLogWithUndo } from '../libraryActions'

const pagesOf = (log: LibraryLog): number => (log.fromPage !== undefined && log.toPage !== undefined ? Math.max(0, log.toPage - log.fromPage) : 0)

function describe(log: LibraryLog, film: boolean): string {
  if (film) return [log.place, log.withWhom && `bersama ${log.withWhom}`].filter(Boolean).join(' · ')
  const range = log.toPage !== undefined ? (log.fromPage !== undefined ? `hlm. ${log.fromPage}–${log.toPage} (${pagesOf(log)} hlm)` : `sampai hlm. ${log.toPage}`) : ''
  return [range, log.minutes && `${log.minutes} menit`].filter(Boolean).join(' · ')
}

/** Every time a film was watched, or every sitting with a book, newest first. Adding a viewing marks a film as watched. */
export function LogPanel({ item }: { item: LibraryItem }) {
  const all = useLibraryLogStore((s) => s.items)
  const logs = all.filter((l) => l.itemId === item.id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  const [adding, setAdding] = useState(false)
  const film = item.kind === 'film'
  const pages = logs.reduce((sum, l) => sum + pagesOf(l), 0)

  return (
    <section aria-labelledby="library-log" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="library-log" className="text-md font-bold">
            {film ? 'Riwayat tonton' : 'Riwayat baca'}
          </h2>
          {logs.length > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {film ? (
                <>Ditonton <span className="tabular-nums">{logs.length}</span> kali</>
              ) : (
                <>
                  <span className="tabular-nums">{logs.length}</span> sesi{pages > 0 && <>, <span className="tabular-nums">{pages}</span> halaman tercatat</>}
                </>
              )}
            </p>
          )}
        </div>
        {!adding && (
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden />
            {film ? 'Catat tontonan' : 'Catat sesi baca'}
          </Button>
        )}
      </div>

      {adding && <LogForm item={item} onDone={() => setAdding(false)} />}

      {logs.length === 0 && !adding ? (
        <EmptyState icon={ClockCounterClockwise} title="Belum ada riwayat" description={film ? 'Catat kapan, di mana, dan bersama siapa kamu menontonnya. Menontonnya lagi nanti tinggal ditambahkan.' : 'Catat tiap kali duduk dengan buku ini, dari halaman berapa sampai berapa.'} />
      ) : (
        <ol className="divide-y rounded-card border bg-surface">
          {logs.map((log) => (
            <li key={log.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{fmt(log.date, 'EEEE, d MMMM yyyy')}</p>
                {describe(log, film) && <p className="truncate text-sm text-muted">{describe(log, film)}</p>}
              </div>
              <IconButton icon={Trash} label={`Hapus riwayat ${fmt(log.date, 'd MMMM yyyy')}`} onClick={() => void removeLogWithUndo(log)} className="hover:text-status-overdue" />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function LogForm({ item, onDone }: { item: LibraryItem; onDone: () => void }) {
  const film = item.kind === 'film'
  const [date, setDate] = useState(isoDay(0))
  const [place, setPlace] = useState('')
  const [withWhom, setWithWhom] = useState('')
  const [fromPage, setFromPage] = useState(String(item.currentPage ?? 0))
  const [toPage, setToPage] = useState('')
  const [minutes, setMinutes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const num = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text) : text.trim() === '' ? undefined : null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!date) return setError('Pilih tanggalnya.')
    if (film) {
      const ok = await addLog(item, { itemId: item.id, date, place: place.trim() || undefined, withWhom: withWhom.trim() || undefined })
      return ok ? onDone() : undefined
    }
    const from = num(fromPage)
    const to = num(toPage)
    const mins = num(minutes)
    if (from === null || to === null || mins === null) return setError('Halaman dan menit harus berupa bilangan bulat.')
    if (to === undefined && mins === undefined) return setError('Isi halaman akhir atau lama membaca.')
    if (to !== undefined && from !== undefined && to < from) return setError('Halaman akhir tidak boleh lebih kecil dari halaman awal.')
    if (to !== undefined && item.pages && to > item.pages) return setError(`Buku ini hanya ${item.pages} halaman.`)
    const ok = await addLog(item, { itemId: item.id, date, fromPage: to === undefined ? undefined : from, toPage: to, minutes: mins })
    if (ok) onDone()
  }

  const invalid = error !== null || undefined
  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-card border bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Tanggal" htmlFor="log-date">
          <input id="log-date" type="date" max={isoDay(0)} value={date} onChange={(e) => setDate(e.target.value)} className={cn(controlClass, 'tabular-nums')} />
        </Field>
        {film ? (
          <>
            <Field label="Di mana" htmlFor="log-place">
              <input id="log-place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Bioskop, di rumah" className={controlClass} />
            </Field>
            <Field label="Bersama" htmlFor="log-with">
              <input id="log-with" value={withWhom} onChange={(e) => setWithWhom(e.target.value)} placeholder="Sendiri" className={controlClass} />
            </Field>
          </>
        ) : (
          <>
            <Field label="Halaman awal" htmlFor="log-from">
              <input id="log-from" inputMode="numeric" value={fromPage} onChange={(e) => (setFromPage(e.target.value), setError(null))} aria-invalid={invalid} className={cn(controlClass, 'font-mono tabular-nums')} />
            </Field>
            <Field label="Halaman akhir" htmlFor="log-to">
              <input id="log-to" inputMode="numeric" value={toPage} onChange={(e) => (setToPage(e.target.value), setError(null))} aria-invalid={invalid} aria-describedby={error ? 'log-error' : undefined} className={cn(controlClass, 'font-mono tabular-nums')} />
            </Field>
            <Field label="Lama (menit)" htmlFor="log-minutes">
              <input id="log-minutes" inputMode="numeric" value={minutes} onChange={(e) => (setMinutes(e.target.value), setError(null))} aria-invalid={invalid} className={cn(controlClass, 'font-mono tabular-nums')} />
            </Field>
          </>
        )}
      </div>
      {film && item.status !== 'done' && <p className="text-xs text-muted">Mencatat tontonan menandai film ini sudah ditonton.</p>}
      {error && (
        <p id="log-error" role="alert" className="text-sm font-medium text-status-overdue">
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
