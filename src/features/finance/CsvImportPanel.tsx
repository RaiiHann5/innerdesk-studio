import { useMemo, useRef, useState } from 'react'
import { SheetPanel } from '@/components/layout/SheetPanel'
import { Button } from '@/components/ui/Button'
import { Field, controlClass } from '@/components/ui/Field'
import { buildImportRows, guessMapping, parseCsv, type ImportField, type ImportMapping } from '@/lib/financeCsv'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { useUiStore } from '@/stores/ui'
import { defaultAccountId } from './lib/defaults'
import { useAccountStore, useFinanceCategoryStore, useTransactionStore } from './store/financeStores'
import { Amount } from './ui/Amount'

const FIELDS: Array<{ field: ImportField; label: string; required?: boolean }> = [
  { field: 'date', label: 'Tanggal', required: true },
  { field: 'amount', label: 'Nominal', required: true },
  { field: 'note', label: 'Catatan' },
  { field: 'kind', label: 'Jenis' },
  { field: 'account', label: 'Akun' },
  { field: 'category', label: 'Kategori' },
  { field: 'payee', label: 'Penerima' },
]
const MAX_BYTES = 2_000_000

/** Pick a file, map its columns, check the preview, then save. The file is read in the browser and goes nowhere else. */
export function CsvImportPanel({ onClose }: { onClose: () => void }) {
  const phone = useMediaQuery('(max-width: 767px)')
  const accounts = useAccountStore((s) => s.items)
  const categories = useFinanceCategoryStore((s) => s.items)
  const txs = useTransactionStore((s) => s.items)
  const showToast = useUiStore((s) => s.showToast)
  const input = useRef<HTMLInputElement>(null)
  const [table, setTable] = useState<string[][] | null>(null)
  const [mapping, setMapping] = useState<ImportMapping | null>(null)
  const [step, setStep] = useState<'pilih' | 'petakan' | 'tinjau'>('pilih')
  const [accountId, setAccountId] = useState(() => defaultAccountId(txs, accounts, 'IDR') ?? '')
  const [unsigned, setUnsigned] = useState<'expense' | 'income'>('expense')
  const [withDuplicates, setWithDuplicates] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(0)

  const header = table?.[0] ?? []
  const rows = useMemo(
    () => (table && mapping && step === 'tinjau' ? buildImportRows(table.slice(1), mapping, { accounts, categories, existing: txs, defaultAccountId: accountId, unsignedKind: unsigned }) : []),
    [table, mapping, step, accounts, categories, txs, accountId, unsigned],
  )
  const valid = rows.filter((r) => r.draft)
  const toSave = valid.filter((r) => withDuplicates || !r.duplicate)
  const duplicates = valid.filter((r) => r.duplicate).length
  const failed = rows.filter((r) => r.error)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_BYTES) return setError('Berkasnya terlalu besar (maksimal 2 MB).')
    const parsed = parseCsv(await file.text())
    if (parsed.length < 2) return setError('Berkas kosong atau tidak punya baris data.')
    setTable(parsed)
    setMapping(guessMapping(parsed[0]))
    setError(null)
    setStep('petakan')
  }
  const proceed = () => {
    if (!mapping || mapping.date === null || mapping.amount === null) return setError('Pilih kolom untuk tanggal dan nominal.')
    setError(null)
    setStep('tinjau')
  }
  const save = async () => {
    setSaving(true)
    setError(null)
    let saved = done
    try {
      for (const row of toSave.slice(done)) {
        if (row.draft) await useTransactionStore.getState().add(row.draft)
        saved += 1
        setDone(saved)
      }
      showToast(`${saved} transaksi diimpor.`)
      onClose()
    } catch {
      setError(`${saved} transaksi tersimpan, sisanya belum. Tekan Simpan lagi untuk melanjutkan; yang sudah tersimpan tidak dobel.`)
      setSaving(false)
    }
  }

  return (
    <SheetPanel open onClose={onClose} label="Impor CSV" sheet={phone} wide>
      <div className="space-y-4">
        <p className="text-xs text-muted">Berkas dibaca di perangkat ini dan tidak diunggah ke mana pun.</p>
        {step === 'pilih' && (
          <div className="space-y-2">
            <input ref={input} type="file" accept=".csv,text/csv" aria-label="Pilih berkas CSV" onChange={(e) => void onFile(e.target.files?.[0])} className="block text-sm" />
            <p className="text-xs text-muted">Kolom yang dikenali: tanggal, nominal, catatan, jenis, akun, kategori, penerima. Kamu bisa memetakannya di langkah berikut.</p>
          </div>
        )}
        {step === 'petakan' && mapping && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {FIELDS.map(({ field, label, required }) => (
                <Field key={field} label={required ? `${label} (wajib)` : label} htmlFor={`map-${field}`}>
                  <select id={`map-${field}`} value={mapping[field] ?? ''} onChange={(e) => setMapping({ ...mapping, [field]: e.target.value === '' ? null : Number(e.target.value) })} className={controlClass}>
                    <option value="">Tidak dipakai</option>
                    {header.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `Kolom ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Akun bawaan" htmlFor="imp-account" hint="Dipakai untuk baris tanpa akun. Hanya akun rupiah.">
                <select id="imp-account" value={accountId} onChange={(e) => setAccountId(e.target.value)} className={controlClass}>
                  {accounts.filter((a) => !a.archivedAt && a.currency === 'IDR').map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nominal tanpa tanda minus dianggap" htmlFor="imp-unsigned">
                <select id="imp-unsigned" value={unsigned} onChange={(e) => setUnsigned(e.target.value as 'expense' | 'income')} className={controlClass}>
                  <option value="expense">Pengeluaran</option>
                  <option value="income">Pemasukan</option>
                </select>
              </Field>
            </div>
            <Button variant="primary" onClick={proceed}>
              Lanjut ke pratinjau
            </Button>
          </div>
        )}
        {step === 'tinjau' && (
          <div className="space-y-3">
            <p role="status" className="text-sm">
              <span className="tabular-nums">{toSave.length}</span> transaksi akan disimpan
              {duplicates > 0 && <>, <span className="tabular-nums">{duplicates}</span> kemungkinan duplikat</>}
              {failed.length > 0 && <>, <span className="tabular-nums">{failed.length}</span> baris tidak bisa dibaca</>}.
            </p>
            {duplicates > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={withDuplicates} onChange={(e) => setWithDuplicates(e.target.checked)} className="accent-[var(--accent)]" />
                Tetap simpan yang kemungkinan duplikat (tanggal, nominal, dan catatan sama)
              </label>
            )}
            <div className="max-h-80 overflow-auto rounded-card border">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Pratinjau impor</caption>
                <thead className="sticky top-0 bg-sunken text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-1.5">Baris</th>
                    <th scope="col" className="px-3 py-1.5">Tanggal</th>
                    <th scope="col" className="px-3 py-1.5">Catatan</th>
                    <th scope="col" className="px-3 py-1.5 text-right">Nominal</th>
                    <th scope="col" className="px-3 py-1.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.slice(0, 200).map((r) => (
                    <tr key={r.line}>
                      <td className="px-3 py-1.5 tabular-nums text-muted">{r.line}</td>
                      <td className="px-3 py-1.5 tabular-nums">{r.draft?.date ?? ''}</td>
                      <td className="max-w-40 truncate px-3 py-1.5">{r.draft?.note ?? ''}</td>
                      <td className="px-3 py-1.5 text-right">{r.draft && <Amount minor={r.draft.amountMinor} signed={r.draft.kind === 'income'} spoken={r.draft.kind === 'income' ? 'pemasukan' : 'pengeluaran'} />}</td>
                      <td className={r.error ? 'px-3 py-1.5 text-status-overdue' : 'px-3 py-1.5 text-muted'}>{r.error ?? (r.duplicate ? 'Mungkin duplikat' : 'Baru')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 200 && <p className="text-xs text-muted">Menampilkan 200 baris pertama dari {rows.length}. Semua baris ikut diproses.</p>}
            <div className="flex gap-2 border-t pt-3">
              <Button variant="primary" disabled={saving || toSave.length === 0} onClick={() => void save()}>
                Simpan {toSave.length} transaksi
              </Button>
              <Button disabled={saving} onClick={() => setStep('petakan')}>
                Kembali
              </Button>
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-status-overdue">
            {error}
          </p>
        )}
      </div>
    </SheetPanel>
  )
}
