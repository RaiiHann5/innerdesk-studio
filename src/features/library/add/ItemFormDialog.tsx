import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, controlClass } from '@/components/ui/Field'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { cn } from '@/lib/cn'
import { KIND_LABEL, STATUSES, STATUS_SHORT, appendOrder, findDuplicate, splitList } from '@/lib/library'
import { useLibraryItemStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { CategoryColor, LibraryItem, LibraryKind, LibraryStatus } from '@/types/domain'
import { ProjectColorPicker } from '../../projects/ProjectColorPicker'
import { detailPath } from '../libraryUi'
import { PeopleEditor } from './PeopleEditor'
import { buildInput, draftFromItem, emptyDraft, type Draft } from './itemDraft'

interface ItemFormDialogProps {
  open: boolean
  /** The kind to start a new item as. Ignored when editing: a film does not become a book. */
  kind?: LibraryKind
  /** The item to edit. Leave out to add a new one. */
  item?: LibraryItem
  onClose: () => void
}

export function ItemFormDialog({ open, kind = 'film', item, onClose }: ItemFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} label={item ? `Ubah ${item.title}` : 'Tambah ke Library'} className="mt-[4vh] max-w-xl">
      {open && <Form key={item?.id ?? kind} kind={item?.kind ?? kind} item={item} onClose={onClose} />}
    </Dialog>
  )
}

const FORMATS: Array<{ value: Draft['format']; label: string }> = [
  { value: '', label: 'Tidak diisi' },
  { value: 'cetak', label: 'Cetak' },
  { value: 'ebook', label: 'E-book' },
  { value: 'audio', label: 'Audio' },
]

function Form({ kind: initialKind, item, onClose }: { kind: LibraryKind; item?: LibraryItem; onClose: () => void }) {
  const navigate = useNavigate()
  const items = useLibraryItemStore((s) => s.items)
  const add = useLibraryItemStore((s) => s.add)
  const update = useLibraryItemStore((s) => s.update)
  const showToast = useUiStore((s) => s.showToast)

  const [kind, setKind] = useState<LibraryKind>(initialKind)
  const [draft, setDraft] = useState<Draft>(() => (item ? draftFromItem(item) : emptyDraft()))
  const [problem, setProblem] = useState<{ field: keyof Draft; error: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    if (problem?.field === key) setProblem(null)
  }
  const bind = (key: keyof Draft) => ({
    id: `lib-${key}`,
    value: draft[key] as string,
    onChange: (e: { target: { value: string } }) => set(key, e.target.value as never),
    'aria-invalid': problem?.field === key || undefined,
    'aria-describedby': problem?.field === key ? 'lib-error' : undefined,
  })

  const duplicate = useMemo(
    () => findDuplicate(items, { kind, title: draft.title, year: Number(draft.year) || undefined, isbn: draft.isbn, authors: splitList(draft.authors) }, item?.id),
    [items, kind, draft.title, draft.year, draft.isbn, draft.authors, item?.id],
  )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const built = buildInput(draft, kind)
    if (!built.ok) {
      setProblem({ field: built.field, error: built.error })
      document.getElementById(`lib-${built.field}`)?.focus()
      return
    }
    setSaving(true)
    try {
      if (item) {
        // An edit does not touch where the item stands: that has its own control on the page.
        const { status: _status, finishedAt: _finishedAt, ...fields } = built.value
        await update(item.id, fields)
        showToast('Perubahan disimpan')
        onClose()
      } else {
        const created = await add({ ...built.value, order: appendOrder(items, kind) })
        showToast(`“${created.title}” ditambahkan`)
        onClose()
        navigate(detailPath(created))
      }
    } catch {
      setProblem({ field: 'title', error: 'Gagal menyimpan. Coba lagi.' })
      setSaving(false)
    }
  }

  const isFilm = kind === 'film'

  return (
    <form onSubmit={submit} noValidate>
      <div className="max-h-[78dvh] space-y-4 overflow-y-auto p-4">
        <h2 className="text-lg font-bold tracking-tight">{item ? `Ubah ${KIND_LABEL[kind].toLowerCase()}` : 'Tambah ke Library'}</h2>

        {!item && (
          <SegmentedControl<LibraryKind>
            label="Jenis"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'film', label: 'Film' },
              { value: 'buku', label: 'Buku' },
            ]}
          />
        )}

        <Field label="Judul" htmlFor="lib-title">
          <input {...bind('title')} autoFocus placeholder={isFilm ? 'Misalnya: Oppenheimer' : 'Misalnya: Bumi Manusia'} className={controlClass} />
        </Field>
        {duplicate && (
          <p role="status" className="rounded-control bg-sunken/60 p-2.5 text-sm text-muted">
            Sepertinya sudah ada di Library: <Link to={detailPath(duplicate)} onClick={onClose} className="font-medium text-ink underline underline-offset-2">{duplicate.title}</Link>. Kamu tetap bisa menyimpannya.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
          <Field label="Judul asli" htmlFor="lib-originalTitle">
            <input {...bind('originalTitle')} className={controlClass} />
          </Field>
          <Field label="Tahun" htmlFor="lib-year">
            <input {...bind('year')} inputMode="numeric" maxLength={4} className={cn(controlClass, 'tabular-nums')} />
          </Field>
        </div>

        {isFilm ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <Field label="Sutradara" htmlFor="lib-director">
              <input {...bind('director')} className={controlClass} />
            </Field>
            <Field label="Durasi (menit)" htmlFor="lib-runtime">
              <input {...bind('runtime')} inputMode="numeric" className={cn(controlClass, 'tabular-nums')} />
            </Field>
          </div>
        ) : (
          <>
            <Field label="Penulis" htmlFor="lib-authors" hint="Pisahkan dengan koma.">
              <input {...bind('authors')} className={controlClass} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Jumlah halaman" htmlFor="lib-pages">
                <input {...bind('pages')} inputMode="numeric" className={cn(controlClass, 'tabular-nums')} />
              </Field>
              {item && (
                <Field label="Halaman saat ini" htmlFor="lib-currentPage">
                  <input {...bind('currentPage')} inputMode="numeric" className={cn(controlClass, 'tabular-nums')} />
                </Field>
              )}
              <Field label="Format" htmlFor="lib-format">
                <select {...bind('format')} className={controlClass}>
                  {FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Penerbit" htmlFor="lib-publisher">
                <input {...bind('publisher')} className={controlClass} />
              </Field>
              <Field label="ISBN" htmlFor="lib-isbn">
                <input {...bind('isbn')} className={cn(controlClass, 'font-mono')} />
              </Field>
            </div>
          </>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Genre" htmlFor="lib-genres" hint="Pisahkan dengan koma.">
            <input {...bind('genres')} placeholder="Drama, Sejarah" className={controlClass} />
          </Field>
          <Field label="Tag" htmlFor="lib-tags" hint="Pisahkan dengan koma.">
            <input {...bind('tags')} className={controlClass} />
          </Field>
        </div>

        <Field label="Sinopsis" htmlFor="lib-synopsis">
          <textarea {...bind('synopsis')} rows={4} className={cn(controlClass, 'h-auto resize-y py-1.5 font-serif leading-relaxed')} />
        </Field>

        {isFilm && (
          <>
            <PeopleEditor legend="Pemeran" rows={draft.cast} onChange={(rows) => set('cast', rows)} namePlaceholder="Nama" detailLabel="peran" detailPlaceholder="Peran" addLabel="Tambah pemeran" />
            <PeopleEditor legend="Kru" rows={draft.crew} onChange={(rows) => set('crew', rows)} namePlaceholder="Nama" detailLabel="tugas" detailPlaceholder="Tugas, misalnya Penulis" addLabel="Tambah kru" />
          </>
        )}

        <Field label="Tautan sampul" htmlFor="lib-coverUrl" hint="Opsional. Hanya tautannya yang disimpan, bukan gambarnya. Tanpa tautan, sampul digambar dari judul.">
          <input {...bind('coverUrl')} inputMode="url" placeholder="https://" className={controlClass} />
        </Field>

        <div className="space-y-1.5">
          <span className="text-sm font-medium">Warna sampul</span>
          <div className="flex flex-wrap items-center gap-3">
            <ProjectColorPicker value={draft.accent ?? 'moss'} onChange={(c: CategoryColor) => set('accent', c)} label="Warna sampul" />
            {draft.accent && (
              <Button variant="ghost" onClick={() => set('accent', undefined)} className="h-7 px-2 text-sm">
                Otomatis dari judul
              </Button>
            )}
          </div>
          {!draft.accent && <p className="text-xs text-muted">Sekarang otomatis, dipilih dari judul.</p>}
        </div>

        {!item && (
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Status awal</span>
            <div>
              <SegmentedControl<LibraryStatus>
                label="Status awal"
                value={draft.status}
                onChange={(s) => set('status', s)}
                options={STATUSES.map((value) => ({ value, label: STATUS_SHORT[value] }))}
              />
            </div>
          </div>
        )}

        {problem && (
          <p id="lib-error" role="alert" className="text-sm font-medium text-status-overdue">
            {problem.error}
          </p>
        )}
      </div>

      <footer className="flex items-center justify-end gap-2 border-t bg-sunken/50 px-4 py-3">
        <Button onClick={onClose}>Batal</Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {item ? 'Simpan perubahan' : 'Tambahkan'}
        </Button>
      </footer>
    </form>
  )
}
