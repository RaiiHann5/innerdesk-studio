import { useEffect, useMemo, useState } from 'react'
import { Receipt } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { StoreGate } from '@/components/ui/StoreGate'
import { isoDay } from '@/lib/date'
import { sortTransactions } from '@/lib/financeList'
import { spendPerProject } from '@/lib/financeSelectors'
import { TransactionEditor, type EditorTarget } from './TransactionEditor'
import { FINANCE_STORES, loadFinance, useAccountStore, useFinanceCategoryStore, useTransactionStore } from './store/financeStores'
import { Amount } from './ui/Amount'
import { FinanceSkeleton } from './ui/FinanceSkeleton'
import { TransactionRow } from './ui/TransactionRow'

function Body({ projectId, today }: { projectId: string; today: string }) {
  const accounts = useAccountStore((s) => s.items)
  const categories = useFinanceCategoryStore((s) => s.items)
  const txs = useTransactionStore((s) => s.items)
  const [editor, setEditor] = useState<EditorTarget | null>(null)
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const totals = useMemo(() => spendPerProject(txs).find((p) => p.projectId === projectId), [txs, projectId])
  const own = useMemo(() => sortTransactions(txs.filter((t) => t.projectId === projectId), 'terbaru'), [txs, projectId])
  const add = () => setEditor({ mode: 'new', defaults: { projectId } })

  return (
    <div className="space-y-4">
      <section aria-label="Keuangan proyek" className="grid grid-cols-3 gap-3">
        {[
          ['Pemasukan', totals?.incomeMinor ?? 0, true],
          ['Pengeluaran', totals?.expenseMinor ?? 0, false],
          ['Selisih', totals?.netMinor ?? 0, true],
        ].map(([label, minor, signed]) => (
          <div key={label as string} className="rounded-card border bg-surface p-3">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-lg font-bold tracking-tight">
              <Amount minor={minor as number} signed={(signed as boolean) && ((minor as number) > 0 || label === 'Selisih')} />
            </p>
          </div>
        ))}
      </section>
      <div className="flex justify-end">
        <Button variant="primary" onClick={add}>
          Catat transaksi
        </Button>
      </div>
      {own.length === 0 ? (
        <EmptyState icon={Receipt} title="Belum ada transaksi untuk proyek ini" description="Catat pemasukan dari klien atau biaya proyek, dan selisihnya muncul di sini." action={<Button onClick={add}>Catat transaksi</Button>} />
      ) : (
        <ul className="divide-y overflow-hidden rounded-card border bg-surface">
          {own.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} accounts={accountMap} categories={categoryMap} onOpen={(t) => setEditor({ mode: 'edit', tx: t })} />
          ))}
        </ul>
      )}
      {editor && <TransactionEditor key={editor.mode === 'edit' ? editor.tx.id : 'new'} target={editor} today={today} onClose={() => setEditor(null)} />}
    </div>
  )
}

/** The "Keuangan" tab of a project: income, expense and net for that project, with the same rows as Transaksi. */
export function ProjectFinanceTab({ projectId }: { projectId: string }) {
  useEffect(() => {
    void loadFinance()
  }, [])
  return (
    <StoreGate stores={FINANCE_STORES} skeleton={<FinanceSkeleton variant="list" />}>
      <Body projectId={projectId} today={isoDay(0)} />
    </StoreGate>
  )
}
