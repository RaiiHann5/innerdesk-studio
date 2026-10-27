import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react'
import { SheetPanel } from '@/components/layout/SheetPanel'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, controlClass } from '@/components/ui/Field'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { BASE_CURRENCY } from '@/lib/config'
import { lastRateFor } from '@/lib/financeSelectors'
import { validateTransaction, type TransactionIssue } from '@/lib/financeValidate'
import { useModHotkey, modKey } from '@/lib/hotkeys'
import { formatMoney, parseMoney, parseRate, toBase } from '@/lib/money'
import { parseTags } from '@/lib/taskFields'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { useUiStore } from '@/stores/ui'
import { useProjectStore } from '@/stores/entities'
import type { NewEntity, Transaction, TransactionKind } from '@/types/domain'
import { deleteTransactionWithUndo } from './actions'
import { KIND_LABEL } from './labels'
import { defaultAccountId } from './lib/defaults'
import { useAccountStore, useFinanceCategoryStore, useTransactionStore } from './store/financeStores'

export type EditorTarget = { mode: 'new'; defaults?: Partial<NewEntity<Transaction>> } | { mode: 'edit'; tx: Transaction }

interface TransactionEditorProps {
  target: EditorTarget
  today: string
  /** Must be stable (useCallback): the panel re-focuses itself when this changes. */
  onClose: () => void
}

const KINDS = (Object.keys(KIND_LABEL) as TransactionKind[]).map((value) => ({ value, label: KIND_LABEL[value] }))
const FIELD_ORDER: TransactionIssue['field'][] = ['amount', 'date', 'account', 'toAccount', 'toAmount', 'fx', 'category', 'currency']

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} role="alert" className="text-xs text-status-overdue">
      {message}
    </p>
  ) : null
}

/**
 * Right drawer on desktop, bottom sheet on a phone. Nothing saves by itself: Simpan (or Ctrl/Cmd+Enter) checks the
 * rules and writes once; Esc closes. A transaction in another currency than rupiah carries the rate used and the
 * rupiah value at that moment, and that value is what every report reads afterwards.
 */
export function TransactionEditor({ target, today, onClose }: TransactionEditorProps) {
  const phone = useMediaQuery('(max-width: 767px)')
  const accounts = useAccountStore((s) => s.items)
  const categories = useFinanceCategoryStore((s) => s.items)
  const txs = useTransactionStore((s) => s.items)
  const add = useTransactionStore((s) => s.add)
  const update = useTransactionStore((s) => s.update)
  const projects = useProjectStore((s) => s.items)
  const showToast = useUiStore((s) => s.showToast)

  const existing = target.mode === 'edit' ? target.tx : undefined
  const initial: Partial<Transaction> = target.mode === 'edit' ? target.tx : (target.defaults ?? {})
  const firstAccount = initial.accountId ?? defaultAccountId(txs, accounts)

  const [kind, setKind] = useState<TransactionKind>(initial.kind ?? 'expense')
  const [accountId, setAccountId] = useState(firstAccount ?? '')
  const [toAccountId, setToAccountId] = useState(initial.toAccountId ?? '')
  const accountCurrency = accounts.find((a) => a.id === accountId)?.currency ?? BASE_CURRENCY
  const [amountText, setAmountText] = useState(initial.amountMinor ? formatMoney(initial.amountMinor, initial.currency ?? accountCurrency, { bare: true }) : '')
  const [toAmountText, setToAmountText] = useState(
    initial.toAmountMinor ? formatMoney(initial.toAmountMinor, accounts.find((a) => a.id === initial.toAccountId)?.currency ?? BASE_CURRENCY, { bare: true }) : '',
  )
  const [date, setDate] = useState(initial.date ?? today)
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? '')
  const [note, setNote] = useState(initial.note ?? '')
  const [payee, setPayee] = useState(initial.payee ?? '')
  const [projectId, setProjectId] = useState(initial.projectId ?? '')
  const [tagsText, setTagsText] = useState((initial.tags ?? []).join(', '))
  // null means "follow the suggested rate"; once the person types, their value wins.
  const [rateText, setRateText] = useState<string | null>(initial.fx ? String(initial.fx.rate).replace('.', ',') : null)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Escape closes the confirmation first; the drawer behind it stays.
  const confirmOpen = useRef(false)
  confirmOpen.current = confirmDelete
  const close = useCallback(() => {
    if (!confirmOpen.current) onClose()
  }, [onClose])

  const account = accounts.find((a) => a.id === accountId)
  const toAccount = accounts.find((a) => a.id === toAccountId)
  const currency = account?.currency ?? BASE_CURRENCY
  const foreign = kind !== 'transfer' && currency !== BASE_CURRENCY
  const crossCurrency = kind === 'transfer' && !!account && !!toAccount && account.currency !== toAccount.currency
  const suggestedRate = foreign ? lastRateFor(currency, txs) : null
  const rateInput = rateText ?? (suggestedRate ? String(suggestedRate).replace('.', ',') : '')

  const { draft, parseIssues } = useMemo(() => {
    const issues: TransactionIssue[] = []
    const amount = parseMoney(amountText, currency)
    if (amountText.trim() && amount === null) issues.push({ field: 'amount', message: 'Nominal tidak valid. Contoh: 35.000, 35rb, atau 1,5jt.' })
    const received = crossCurrency && toAccount ? parseMoney(toAmountText, toAccount.currency) : null
    if (crossCurrency && toAmountText.trim() && received === null) issues.push({ field: 'toAmount', message: 'Jumlah diterima tidak valid.' })
    const rate = foreign ? parseRate(rateInput) : null
    if (foreign && rateInput.trim() && rate === null) issues.push({ field: 'fx', message: 'Kurs tidak valid. Contoh: 16.250.' })
    let fx: Transaction['fx']
    if (foreign && amount && rate) fx = toBase(amount, currency, rate, BASE_CURRENCY)
    const input: NewEntity<Transaction> = {
      date,
      kind,
      amountMinor: amount ?? 0,
      currency,
      fx,
      accountId,
      toAccountId: kind === 'transfer' ? toAccountId || undefined : undefined,
      toAmountMinor: crossCurrency && received ? received : undefined,
      categoryId: kind === 'transfer' ? undefined : categoryId || undefined,
      note: note.trim() || undefined,
      payee: payee.trim() || undefined,
      projectId: projectId || undefined,
      tags: parseTags(tagsText),
      recurringId: initial.recurringId,
    }
    return { draft: input, parseIssues: issues }
  }, [amountText, toAmountText, rateInput, foreign, crossCurrency, currency, toAccount, date, kind, accountId, toAccountId, categoryId, note, payee, projectId, tagsText, initial.recurringId])

  const issues = useMemo(() => {
    const parsed = new Set(parseIssues.map((i) => i.field))
    return [...parseIssues, ...validateTransaction(draft, accounts, categories).filter((i) => !parsed.has(i.field))]
  }, [parseIssues, draft, accounts, categories])
  const errorFor = (field: TransactionIssue['field']) => (submitted ? issues.find((i) => i.field === field)?.message : undefined)

  const save = useCallback(async () => {
    setSubmitted(true)
    setSaveError(null)
    if (issues.length) {
      const first = FIELD_ORDER.find((f) => issues.some((i) => i.field === f))
      window.setTimeout(() => document.getElementById(`tx-${first}`)?.focus(), 0)
      return
    }
    setSaving(true)
    try {
      if (existing) await update(existing.id, draft)
      else await add(draft)
      showToast(existing ? 'Transaksi diperbarui.' : 'Transaksi dicatat.')
      onClose()
    } catch {
      setSaveError('Transaksi gagal disimpan. Isinya masih di sini, coba simpan lagi.')
      setSaving(false)
    }
  }, [issues, existing, update, add, draft, showToast, onClose])

  const saveRef = useRef(save)
  saveRef.current = save
  useModHotkey('enter', useCallback(() => void saveRef.current(), []))

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void save()
  }
  const onKind = (next: TransactionKind) => {
    setKind(next)
    if (next === 'transfer') setCategoryId('')
    else if (categories.find((c) => c.id === categoryId)?.kind !== next) setCategoryId('')
  }

  const categoryOptions = categories.filter((c) => c.kind === kind && (!c.archivedAt || c.id === categoryId))
  const describe = (field: TransactionIssue['field']) => (errorFor(field) ? `tx-${field}-error` : undefined)
  const invalid = (field: TransactionIssue['field']) => errorFor(field) !== undefined || undefined
  const received = crossCurrency && toAccount ? toAccount.currency : null
  const baseValue = draft.fx?.baseAmountMinor

  return (
    <SheetPanel open onClose={close} label={existing ? 'Ubah transaksi' : 'Catat transaksi'} sheet={phone} wide>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <SegmentedControl label="Jenis transaksi" options={KINDS} value={kind} onChange={onKind} fullWidth />

        <Field label="Nominal" htmlFor="tx-amount">
          <div className="relative">
            <input
              id="tx-amount"
              inputMode="decimal"
              autoFocus={!existing}
              autoComplete="off"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              aria-invalid={invalid('amount')}
              aria-describedby={describe('amount')}
              placeholder="35.000"
              className={`${controlClass} pr-12 text-right tabular-nums`}
            />
            <span aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">
              {currency}
            </span>
          </div>
          <FieldError id="tx-amount-error" message={errorFor('amount')} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal" htmlFor="tx-date">
            <input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={invalid('date')} aria-describedby={describe('date')} className={controlClass} />
            <FieldError id="tx-date-error" message={errorFor('date')} />
          </Field>
          <Field label={kind === 'transfer' ? 'Dari akun' : 'Akun'} htmlFor="tx-account">
            <select id="tx-account" value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-invalid={invalid('account') ?? invalid('currency')} aria-describedby={describe('account') ?? describe('currency')} className={controlClass}>
              <option value="">Pilih akun</option>
              {accounts.filter((a) => !a.archivedAt || a.id === accountId).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>
            <FieldError id="tx-account-error" message={errorFor('account') ?? errorFor('currency')} />
          </Field>
        </div>

        {kind === 'transfer' && (
          <>
            <Field label="Ke akun" htmlFor="tx-toAccount">
              <select id="tx-toAccount" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} aria-invalid={invalid('toAccount')} aria-describedby={describe('toAccount')} className={controlClass}>
                <option value="">Pilih akun tujuan</option>
                {accounts.filter((a) => (!a.archivedAt || a.id === toAccountId) && a.id !== accountId).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </select>
              <FieldError id="tx-toAccount-error" message={errorFor('toAccount')} />
            </Field>
            {received && (
              <Field label={`Jumlah yang diterima (${received})`} htmlFor="tx-toAmount" hint="Akun beda mata uang, jadi isi jumlah yang benar-benar masuk.">
                <input id="tx-toAmount" inputMode="decimal" autoComplete="off" value={toAmountText} onChange={(e) => setToAmountText(e.target.value)} aria-invalid={invalid('toAmount')} aria-describedby={describe('toAmount')} className={`${controlClass} text-right tabular-nums`} />
                <FieldError id="tx-toAmount-error" message={errorFor('toAmount')} />
              </Field>
            )}
            <p className="text-xs text-muted">Transfer memindahkan uang antar akun. Tidak dihitung sebagai pemasukan atau pengeluaran.</p>
          </>
        )}

        {foreign && (
          <Field label={`Kurs ke ${BASE_CURRENCY}`} htmlFor="tx-fx" hint={baseValue ? `Nilai tercatat: ${formatMoney(baseValue, BASE_CURRENCY)}. Laporan memakai nilai ini, jadi tidak berubah saat kurs bergerak.` : `Rupiah untuk 1 ${currency}. Diisi dengan kurs terakhir yang dipakai.`}>
            <input id="tx-fx" inputMode="decimal" autoComplete="off" value={rateInput} onChange={(e) => setRateText(e.target.value)} aria-invalid={invalid('fx')} aria-describedby={describe('fx')} placeholder="16.250" className={`${controlClass} text-right tabular-nums`} />
            <FieldError id="tx-fx-error" message={errorFor('fx')} />
          </Field>
        )}

        {kind !== 'transfer' && (
          <Field label="Kategori" htmlFor="tx-category">
            <select id="tx-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-invalid={invalid('category')} aria-describedby={describe('category')} className={controlClass}>
              <option value="">Tanpa kategori</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <FieldError id="tx-category-error" message={errorFor('category')} />
          </Field>
        )}

        <Field label="Catatan" htmlFor="tx-note">
          <input id="tx-note" value={note} onChange={(e) => setNote(e.target.value)} autoComplete="off" className={controlClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Penerima atau pemberi" htmlFor="tx-payee">
            <input id="tx-payee" value={payee} onChange={(e) => setPayee(e.target.value)} autoComplete="off" className={controlClass} />
          </Field>
          <Field label="Proyek" htmlFor="tx-project">
            <select id="tx-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={controlClass}>
              <option value="">Tanpa proyek</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Tag" htmlFor="tx-tags" hint="Pisahkan dengan koma.">
          <input id="tx-tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} autoComplete="off" className={controlClass} />
        </Field>

        {saveError && (
          <p role="alert" className="text-sm text-status-overdue">
            {saveError}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button type="submit" variant="primary" disabled={saving}>
            Simpan
          </Button>
          <Button onClick={onClose}>Batal</Button>
          {existing && (
            <Button variant="ghost" className="ml-auto text-status-overdue" onClick={() => setConfirmDelete(true)}>
              Hapus
            </Button>
          )}
        </div>
        <p className="text-xs text-muted">
          {modKey}+Enter untuk menyimpan, Esc untuk menutup.
        </p>
      </form>
      <ConfirmDialog
        open={confirmDelete}
        label="Hapus transaksi"
        title="Hapus transaksi ini?"
        description="Kamu bisa mengurungkannya sebentar setelah dihapus."
        confirmLabel="Hapus"
        destructive
        onConfirm={() => {
          if (!existing) return
          onClose()
          void deleteTransactionWithUndo(existing)
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </SheetPanel>
  )
}
