import { useMemo, useState } from 'react'
import { PiggyBank } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { shiftMonth } from '@/lib/financeDates'
import { budgetOverview, type BudgetLine } from '@/lib/financeSelectors'
import { parseMoney } from '@/lib/money'
import { toastWithRetry } from '@/stores/retryToast'
import { useUiStore } from '@/stores/ui'
import { copyBudgetsFrom, saveBudgetLimit } from './planningActions'
import { useBudgetStore, useFinanceCategoryStore, useTransactionStore } from './store/financeStores'
import { Amount } from './ui/Amount'
import { LimitEditor } from './ui/LimitEditor'
import { UpcomingBills } from './ui/UpcomingBills'
import { UsageBar } from './ui/UsageBar'

interface BudgetsTabProps {
  month: string
  today: string
  onManageBills: () => void
}

export function BudgetsTab({ month, today, onManageBills }: BudgetsTabProps) {
  const budgets = useBudgetStore((s) => s.items)
  const categories = useFinanceCategoryStore((s) => s.items)
  const txs = useTransactionStore((s) => s.items)
  const removeBudget = useBudgetStore((s) => s.remove)
  const showToast = useUiStore((s) => s.showToast)
  const [removing, setRemoving] = useState<BudgetLine | null>(null)
  const [newCategory, setNewCategory] = useState('')
  const [newLimit, setNewLimit] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  const overview = useMemo(() => budgetOverview(budgets, txs, month), [budgets, txs, month])
  const names = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories])
  const free = categories.filter((c) => c.kind === 'expense' && !c.archivedAt && !overview.lines.some((l) => l.budget.categoryId === c.id))
  const previous = shiftMonth(month, -1)
  const canCopy = budgets.some((b) => b.month === previous)
  const nameOf = (id: string) => names.get(id) ?? 'Kategori dihapus'

  const copy = async () => {
    try {
      const n = await copyBudgetsFrom(previous, month)
      showToast(n ? `${n} anggaran disalin dari bulan lalu.` : 'Semua kategori sudah punya anggaran bulan ini.')
    } catch {
      toastWithRetry('Anggaran gagal disalin.', copy)
    }
  }
  const add = async () => {
    const limit = parseMoney(newLimit, 'IDR')
    if (!newCategory) return setAddError('Pilih kategori.')
    if (limit === null || limit <= 0) return setAddError('Isi batas lebih dari nol. Contoh: 1,5jt.')
    try {
      await saveBudgetLimit(month, newCategory, limit)
      setNewCategory('')
      setNewLimit('')
      setAddError(null)
    } catch {
      setAddError('Gagal menyimpan. Coba lagi.')
    }
  }

  return (
    <div className="space-y-4">
      <section aria-label="Ringkasan anggaran" className="grid grid-cols-3 gap-3">
        {[
          ['Batas total', overview.totalLimitMinor],
          ['Terpakai', overview.spentInBudgetsMinor],
          [overview.remainingMinor < 0 ? 'Lewat' : 'Sisa', Math.abs(overview.remainingMinor)],
        ].map(([label, minor]) => (
          <div key={label} className="rounded-card border bg-surface p-3">
            <p className="text-xs text-muted">{label}</p>
            <p className={cn('mt-1 text-lg font-bold tracking-tight', label === 'Lewat' && 'text-status-overdue')}>
              <Amount minor={minor as number} />
            </p>
          </div>
        ))}
      </section>

      <section aria-label="Anggaran per kategori" className="rounded-card border bg-surface">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <h3 className="text-sm font-bold">Anggaran bulan ini</h3>
          {canCopy && (
            <Button onClick={() => void copy()}>Salin dari bulan lalu</Button>
          )}
        </header>
        {overview.lines.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title="Belum ada anggaran bulan ini"
            description="Tentukan batas per kategori di bawah, atau salin dari bulan lalu."
            action={canCopy ? <Button onClick={() => void copy()}>Salin dari bulan lalu</Button> : undefined}
          />
        ) : (
          <ul className="divide-y">
            {overview.lines.map((line) => {
              const name = nameOf(line.budget.categoryId)
              return (
                <li key={line.budget.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-base font-medium">{name}</span>
                    <LimitEditor name={name} limitMinor={line.budget.limitMinor} onSave={(v) => saveBudgetLimit(month, line.budget.categoryId, v)} />
                  </div>
                  <UsageBar pct={line.usedPct} over={line.over} label={`Pemakaian anggaran ${name}`} />
                  <div className="flex items-baseline justify-between gap-3 text-xs text-muted">
                    <span>
                      Terpakai <Amount minor={line.spentMinor} />
                      {line.usedPct !== null && <span className="tabular-nums"> ({String(Math.round(line.usedPct)).replace('.', ',')}%)</span>}
                    </span>
                    <span className="flex items-baseline gap-3">
                      {line.over ? (
                        <span className="text-status-overdue">
                          Lewat <Amount minor={-line.remainingMinor} />
                        </span>
                      ) : (
                        <span>
                          Sisa <Amount minor={line.remainingMinor} />
                        </span>
                      )}
                      <button type="button" onClick={() => setRemoving(line)} aria-label={`Hapus anggaran ${name}`} className="rounded-control px-1 hover:text-fg">
                        Hapus
                      </button>
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {(overview.uncategorizedMinor > 0 || overview.unbudgetedMinor > 0) && (
          <dl className="space-y-1 border-t px-4 py-3 text-sm">
            {overview.uncategorizedMinor > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Tanpa kategori</dt>
                <dd>
                  <Amount minor={overview.uncategorizedMinor} />
                </dd>
              </div>
            )}
            {overview.unbudgetedMinor > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Kategori tanpa anggaran</dt>
                <dd>
                  <Amount minor={overview.unbudgetedMinor} />
                </dd>
              </div>
            )}
          </dl>
        )}
        {free.length > 0 && (
          <form
            className="flex flex-wrap items-end gap-2 border-t px-4 py-3"
            onSubmit={(e) => {
              e.preventDefault()
              void add()
            }}
          >
            <Field label="Tambah anggaran" htmlFor="budget-category">
              <select id="budget-category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className={controlClass}>
                <option value="">Pilih kategori</option>
                {free.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Batas" htmlFor="budget-limit">
              <input id="budget-limit" inputMode="decimal" autoComplete="off" placeholder="1,5jt" value={newLimit} onChange={(e) => setNewLimit(e.target.value)} className={`${controlClass} w-32 text-right tabular-nums`} />
            </Field>
            <Button type="submit">Tambah</Button>
            {addError && (
              <p role="alert" className="w-full text-xs text-status-overdue">
                {addError}
              </p>
            )}
          </form>
        )}
      </section>

      <UpcomingBills today={today} onManage={onManageBills} />

      <ConfirmDialog
        open={removing !== null}
        label="Hapus anggaran"
        title={removing ? `Hapus anggaran ${nameOf(removing.budget.categoryId)}?` : ''}
        description="Transaksinya tidak ikut terhapus. Kamu bisa menetapkan batas lagi kapan saja."
        confirmLabel="Hapus"
        destructive
        onConfirm={() => {
          if (removing) void removeBudget(removing.budget.id).catch(() => toastWithRetry('Anggaran gagal dihapus.', () => removeBudget(removing.budget.id)))
        }}
        onClose={() => setRemoving(null)}
      />
    </div>
  )
}
