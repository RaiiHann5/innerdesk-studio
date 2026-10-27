import { useMemo, useState } from 'react'
import { MagnifyingGlass, Receipt } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { CsvImportPanel } from './CsvImportPanel'
import { downloadCsv } from './csvActions'
import { exportTransactionsCsv } from '@/lib/financeCsv'
import { EmptyState } from '@/components/ui/EmptyState'
import { fmt } from '@/lib/date'
import { NO_FILTERS, activeFilterCount, allTags, filterTransactions, groupByDay, sortTransactions, type TransactionFilters, type TransactionSort } from '@/lib/financeList'
import { inMonth } from '@/lib/financeSelectors'
import { useProjectStore } from '@/stores/entities'
import type { Transaction } from '@/types/domain'
import { useAccountStore, useFinanceCategoryStore, useTransactionStore } from './store/financeStores'
import type { EditorTarget } from './TransactionEditor'
import { Amount } from './ui/Amount'
import { QuickAddBar } from './ui/QuickAddBar'
import { TransactionFiltersBar } from './ui/TransactionFilters'
import { TransactionRow } from './ui/TransactionRow'

interface TransactionsTabProps {
  month: string
  today: string
  onEditor: (target: EditorTarget) => void
}

export function TransactionsTab({ month, today, onEditor }: TransactionsTabProps) {
  const accounts = useAccountStore((s) => s.items)
  const categories = useFinanceCategoryStore((s) => s.items)
  const txs = useTransactionStore((s) => s.items)
  const projects = useProjectStore((s) => s.items)
  const [filters, setFilters] = useState<TransactionFilters>(NO_FILTERS)
  const [sort, setSort] = useState<TransactionSort>('terbaru')
  const [importing, setImporting] = useState(false)

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const ranged = Boolean(filters.from || filters.to)
  const visible = useMemo(() => {
    const scope = ranged ? txs : inMonth(txs, month)
    return sortTransactions(filterTransactions(scope, filters, { accounts, categories }), sort)
  }, [txs, month, ranged, filters, sort, accounts, categories])
  const groups = useMemo(() => (sort === 'terbaru' || sort === 'terlama' ? groupByDay(visible) : null), [visible, sort])
  const filtered = activeFilterCount(filters) > 0
  const open = (tx: Transaction) => onEditor({ mode: 'edit', tx })
  const row = (tx: Transaction) => <TransactionRow key={tx.id} tx={tx} accounts={accountMap} categories={categoryMap} onOpen={open} />

  return (
    <div className="space-y-4">
      <QuickAddBar today={today} onOpenEditor={onEditor} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" disabled={visible.length === 0} onClick={() => downloadCsv(`transaksi-${filters.from || month}.csv`, exportTransactionsCsv(visible, { accounts, categories, projects }))}>
          Ekspor CSV ({visible.length})
        </Button>
        <Button variant="ghost" onClick={() => setImporting(true)}>
          Impor CSV
        </Button>
      </div>
      <TransactionFiltersBar
        filters={filters}
        onChange={setFilters}
        sort={sort}
        onSort={setSort}
        accounts={accounts}
        categories={categories}
        projects={projects}
        tags={allTags(txs)}
      />
      {visible.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={MagnifyingGlass}
            title="Tidak ada transaksi yang cocok"
            description="Coba ubah kata kunci atau hapus sebagian filter."
            action={<Button onClick={() => setFilters(NO_FILTERS)}>Hapus filter</Button>}
          />
        ) : (
          <EmptyState
            icon={Receipt}
            title="Belum ada transaksi bulan ini"
            description="Catat pemasukan atau pengeluaran pertama, atau ketik di kolom catat cepat di atas."
            action={
              <Button variant="primary" onClick={() => onEditor({ mode: 'new' })}>
                Catat transaksi
              </Button>
            }
          />
        )
      ) : (
        <>
          <p className="text-xs tabular-nums text-muted">
            {visible.length} transaksi
          </p>
          {groups ? (
            <div className="space-y-4">
              {groups.map((group) => (
                <section key={group.date} aria-label={fmt(group.date, 'EEEE, d MMMM yyyy')} className="overflow-hidden rounded-card border bg-surface">
                  <header className="flex items-baseline justify-between gap-3 border-b bg-sunken/50 px-3 py-1.5">
                    <h3 className="text-sm font-bold">{fmt(group.date, 'EEEE, d MMM')}</h3>
                    {(group.incomeMinor > 0 || group.expenseMinor > 0) && (
                      <span className="text-xs text-muted">
                        <span className="sr-only">Selisih hari ini </span>
                        <Amount minor={group.netMinor} signed />
                      </span>
                    )}
                  </header>
                  <ul className="divide-y">{group.items.map(row)}</ul>
                </section>
              ))}
            </div>
          ) : (
            <ul className="divide-y overflow-hidden rounded-card border bg-surface">{visible.map(row)}</ul>
          )}
        </>
      )}
      {importing && <CsvImportPanel onClose={() => setImporting(false)} />}
    </div>
  )
}
