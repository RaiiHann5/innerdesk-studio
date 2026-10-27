import { useCallback, useState, type FormEvent } from 'react'
import { SheetPanel } from '@/components/layout/SheetPanel'
import { Button } from '@/components/ui/Button'
import { Field, controlClass } from '@/components/ui/Field'
import { fmt } from '@/lib/date'
import { useModHotkey, modKey } from '@/lib/hotkeys'
import { formatMoney, parseMoney } from '@/lib/money'
import { useMediaQuery } from '@/lib/useMediaQuery'
import type { Goal } from '@/types/domain'
import { addContribution, removeContribution } from './planningActions'
import { useGoalStore } from './store/financeStores'
import { Amount } from './ui/Amount'

const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)
const Err = ({ id, text }: { id: string; text?: string }) =>
  text ? (
    <p id={id} role="alert" className="text-xs text-status-overdue">
      {text}
    </p>
  ) : null

/** Create or change a goal. Explicit Simpan; Ctrl/Cmd+Enter saves, Esc closes. */
export function GoalEditor({ goal, today, onClose }: { goal?: Goal; today: string; onClose: () => void }) {
  const phone = useMediaQuery('(max-width: 767px)')
  const [name, setName] = useState(goal?.name ?? '')
  const [target, setTarget] = useState(goal ? formatMoney(goal.targetMinor, 'IDR', { bare: true }) : '')
  const [date, setDate] = useState(goal?.targetDate ?? '')
  const [errors, setErrors] = useState<{ name?: string; target?: string; date?: string; save?: string }>({})
  const [saving, setSaving] = useState(false)
  void today

  const save = useCallback(async () => {
    const targetMinor = parseMoney(target, 'IDR')
    const next = {
      name: name.trim() ? undefined : 'Beri nama target.',
      target: targetMinor === null || targetMinor <= 0 ? 'Isi jumlah target lebih dari nol. Contoh: 10jt.' : undefined,
      date: date && !isDate(date) ? 'Tanggal tidak valid.' : undefined,
    }
    setErrors(next)
    if (next.name || next.target || next.date || targetMinor === null) return
    setSaving(true)
    try {
      const store = useGoalStore.getState()
      if (goal) await store.update(goal.id, { name: name.trim(), targetMinor, targetDate: date || undefined })
      else await store.add({ name: name.trim(), targetMinor, targetDate: date || undefined, contributions: [] })
      onClose()
    } catch {
      setErrors({ save: 'Target gagal disimpan. Isinya masih di sini, coba lagi.' })
      setSaving(false)
    }
  }, [name, target, date, goal, onClose])
  useModHotkey('enter', useCallback(() => void save(), [save]))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void save()
  }
  return (
    <SheetPanel open onClose={onClose} label={goal ? 'Ubah target' : 'Target baru'} sheet={phone}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Nama" htmlFor="goal-name">
          <input id="goal-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? 'goal-name-error' : undefined} className={controlClass} />
          <Err id="goal-name-error" text={errors.name} />
        </Field>
        <Field label="Jumlah target (IDR)" htmlFor="goal-target">
          <input id="goal-target" inputMode="decimal" autoComplete="off" placeholder="10jt" value={target} onChange={(e) => setTarget(e.target.value)} aria-invalid={errors.target ? true : undefined} aria-describedby={errors.target ? 'goal-target-error' : undefined} className={`${controlClass} text-right tabular-nums`} />
          <Err id="goal-target-error" text={errors.target} />
        </Field>
        <Field label="Tanggal target (boleh kosong)" htmlFor="goal-date">
          <input id="goal-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={errors.date ? true : undefined} className={controlClass} />
          <Err id="goal-date-error" text={errors.date} />
        </Field>
        {errors.save && (
          <p role="alert" className="text-sm text-status-overdue">
            {errors.save}
          </p>
        )}
        <div className="flex gap-2 border-t pt-4">
          <Button type="submit" variant="primary" disabled={saving}>
            Simpan
          </Button>
          <Button onClick={onClose}>Batal</Button>
        </div>
        <p className="text-xs text-muted">{modKey}+Enter untuk menyimpan, Esc untuk menutup.</p>
      </form>
    </SheetPanel>
  )
}

/** Add a contribution and see the earlier ones. Contributions never touch account balances. */
export function ContributionPanel({ goalId, today, onClose }: { goalId: string; today: string; onClose: () => void }) {
  const phone = useMediaQuery('(max-width: 767px)')
  const goal = useGoalStore((s) => s.items.find((g) => g.id === goalId))
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  if (!goal) return null

  const save = async () => {
    const amountMinor = parseMoney(amount, 'IDR')
    if (amountMinor === null || amountMinor <= 0) return setError('Isi jumlah lebih dari nol. Contoh: 500rb.')
    if (!isDate(date)) return setError('Tanggal tidak valid.')
    setSaving(true)
    try {
      await addContribution(goal, { date, amountMinor, note: note.trim() || undefined })
      setAmount('')
      setNote('')
      setError(null)
    } catch {
      setError('Setoran gagal disimpan. Coba lagi.')
    }
    setSaving(false)
  }
  const history = [...goal.contributions].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <SheetPanel open onClose={onClose} label={`Setoran untuk ${goal.name}`} sheet={phone}>
      <div className="space-y-4">
        <p className="text-xs text-muted">Ini hanya mencatat bagian tabunganmu yang ditujukan untuk target ini. Saldo akun tidak berubah.</p>
        <form
          noValidate
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Jumlah (IDR)" htmlFor="contrib-amount">
              <input id="contrib-amount" autoFocus inputMode="decimal" autoComplete="off" placeholder="500rb" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? 'contrib-error' : undefined} className={`${controlClass} text-right tabular-nums`} />
            </Field>
            <Field label="Tanggal" htmlFor="contrib-date">
              <input id="contrib-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={controlClass} />
            </Field>
          </div>
          <Field label="Catatan" htmlFor="contrib-note">
            <input id="contrib-note" value={note} onChange={(e) => setNote(e.target.value)} autoComplete="off" className={controlClass} />
          </Field>
          <Err id="contrib-error" text={error ?? undefined} />
          <Button type="submit" variant="primary" disabled={saving}>
            Simpan setoran
          </Button>
        </form>
        {history.length > 0 && (
          <ul className="divide-y rounded-card border" aria-label="Riwayat setoran">
            {history.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block">{fmt(c.date, 'd MMM yyyy')}</span>
                  {c.note && <span className="block truncate text-xs text-muted">{c.note}</span>}
                </span>
                <Amount minor={c.amountMinor} signed />
                <Button variant="ghost" aria-label={`Hapus setoran ${fmt(c.date, 'd MMM yyyy')}`} onClick={() => void removeContribution(goal, c.id).catch(() => setError('Setoran gagal dihapus.'))}>
                  Hapus
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SheetPanel>
  )
}
