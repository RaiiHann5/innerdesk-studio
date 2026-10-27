import { useState, type FormEvent } from 'react'
import { SheetPanel } from '@/components/layout/SheetPanel'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, controlClass } from '@/components/ui/Field'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { formatMoney, parseMoney } from '@/lib/money'
import { useMediaQuery } from '@/lib/useMediaQuery'
import type { Recurring } from '@/types/domain'
import { KIND_LABEL, dayWord } from './labels'
import { useAccountStore, useFinanceCategoryStore, useRecurringStore } from './store/financeStores'
import { Amount } from './ui/Amount'

const FREQS = { weekly: 'Mingguan', monthly: 'Bulanan', yearly: 'Tahunan' } as const
const KINDS = [
  { value: 'expense' as const, label: KIND_LABEL.expense },
  { value: 'income' as const, label: KIND_LABEL.income },
]
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)

function RecurringForm({ item, today, onDone }: { item?: Recurring; today: string; onDone: () => void }) {
  const accounts = useAccountStore((s) => s.items).filter((a) => !a.archivedAt || a.id === item?.accountId)
  const categories = useFinanceCategoryStore((s) => s.items)
  const [name, setName] = useState(item?.name ?? '')
  const [kind, setKind] = useState<'income' | 'expense'>(item?.kind === 'income' ? 'income' : 'expense')
  const [accountId, setAccountId] = useState(item?.accountId ?? accounts[0]?.id ?? '')
  const currency = accounts.find((a) => a.id === accountId)?.currency ?? 'IDR'
  const [amount, setAmount] = useState(item ? formatMoney(item.amountMinor, item.currency, { bare: true }) : '')
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? '')
  const [freq, setFreq] = useState<Recurring['freq']>(item?.freq ?? 'monthly')
  const [interval, setInterval] = useState(String(item?.interval ?? 1))
  const [nextDate, setNextDate] = useState(item?.nextDate ?? today)
  const [active, setActive] = useState(item?.active ?? true)
  const [errors, setErrors] = useState<string[]>([])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const amountMinor = parseMoney(amount, currency)
    const every = Number(interval)
    const found = [
      !name.trim() && 'Beri nama tagihan.',
      !accountId && 'Pilih akun.',
      (amountMinor === null || amountMinor <= 0) && 'Isi nominal lebih dari nol. Contoh: 350rb.',
      (!Number.isInteger(every) || every < 1) && 'Ulangi setiap berapa kali harus bilangan bulat, minimal 1.',
      !isDate(nextDate) && 'Tanggal berikutnya tidak valid.',
    ].filter(Boolean) as string[]
    setErrors(found)
    if (found.length || amountMinor === null) return
    const input = { name: name.trim(), kind, amountMinor, currency, accountId, categoryId: kind === 'income' || categoryId ? categoryId || undefined : undefined, freq, interval: every, nextDate, active }
    try {
      const store = useRecurringStore.getState()
      if (item) await store.update(item.id, input)
      else await store.add(input)
      onDone()
    } catch {
      setErrors(['Gagal menyimpan. Isinya masih di sini, coba lagi.'])
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-3">
      <SegmentedControl label="Jenis" options={KINDS} value={kind} onChange={(k) => { setKind(k); setCategoryId('') }} fullWidth />
      <Field label="Nama" htmlFor="rec-name">
        <input id="rec-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" className={controlClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Nominal (${currency})`} htmlFor="rec-amount">
          <input id="rec-amount" inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${controlClass} text-right tabular-nums`} />
        </Field>
        <Field label="Akun" htmlFor="rec-account">
          <select id="rec-account" value={accountId} onChange={(e) => setAccountId(e.target.value)} className={controlClass}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Kategori" htmlFor="rec-category">
        <select id="rec-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={controlClass}>
          <option value="">Tanpa kategori</option>
          {categories.filter((c) => c.kind === kind && (!c.archivedAt || c.id === categoryId)).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Ulangi" htmlFor="rec-freq">
          <select id="rec-freq" value={freq} onChange={(e) => setFreq(e.target.value as Recurring['freq'])} className={controlClass}>
            {Object.entries(FREQS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Setiap" htmlFor="rec-interval">
          <input id="rec-interval" inputMode="numeric" value={interval} onChange={(e) => setInterval(e.target.value)} className={`${controlClass} text-right tabular-nums`} />
        </Field>
        <Field label="Berikutnya" htmlFor="rec-next">
          <input id="rec-next" type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className={controlClass} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-[var(--accent)]" />
        Aktif
      </label>
      {errors.length > 0 && (
        <ul role="alert" className="space-y-0.5 text-sm text-status-overdue">
          {errors.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
      <div className="flex gap-2 border-t pt-3">
        <Button type="submit" variant="primary">
          Simpan
        </Button>
        <Button onClick={onDone}>Batal</Button>
      </div>
    </form>
  )
}

/** Simple management of recurring bills: list, add, change, switch off, delete. Recording stays manual. */
export function RecurringManager({ today, onClose }: { today: string; onClose: () => void }) {
  const phone = useMediaQuery('(max-width: 767px)')
  const items = useRecurringStore((s) => s.items)
  const [editing, setEditing] = useState<Recurring | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Recurring | null>(null)

  return (
    <SheetPanel open onClose={() => (editing ? setEditing(null) : onClose())} label="Kelola tagihan" sheet={phone}>
      {editing ? (
        <RecurringForm key={editing === 'new' ? 'new' : editing.id} item={editing === 'new' ? undefined : editing} today={today} onDone={() => setEditing(null)} />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted">Tagihan tidak pernah dicatat otomatis. Kamu menekan Catat saat sudah dibayar.</p>
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Belum ada tagihan berulang.</p>
          ) : (
            <ul className="divide-y rounded-card border">
              {items.map((r) => (
                <li key={r.id} className="flex items-center gap-2 px-3 py-2">
                  <button type="button" onClick={() => setEditing(r)} className="min-w-0 flex-1 text-left" aria-label={`Ubah ${r.name}`}>
                    <span className="block truncate text-base font-medium">{r.name}</span>
                    <span className="block text-xs text-muted">
                      {FREQS[r.freq]}{r.interval > 1 ? ` setiap ${r.interval}` : ''} · {r.active ? dayWord(r.nextDate, today) : 'nonaktif'}
                    </span>
                  </button>
                  <Amount minor={r.amountMinor} currency={r.currency} signed={r.kind === 'income'} />
                  <Button variant="ghost" aria-label={`Hapus ${r.name}`} onClick={() => setDeleting(r)}>
                    Hapus
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button onClick={() => setEditing('new')}>Tagihan baru</Button>
        </div>
      )}
      <ConfirmDialog
        open={deleting !== null}
        label="Hapus tagihan"
        title={deleting ? `Hapus ${deleting.name}?` : ''}
        description="Transaksi yang sudah dicatat dari tagihan ini tetap ada."
        confirmLabel="Hapus"
        destructive
        onConfirm={() => deleting && void useRecurringStore.getState().remove(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </SheetPanel>
  )
}
