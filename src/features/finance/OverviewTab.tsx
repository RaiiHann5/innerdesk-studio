import { useMemo } from 'react'
import { buildInsights } from '@/lib/financeInsights'
import { accountBalances, categoryTotals, monthSummary, monthlySeries, netBalance } from '@/lib/financeSelectors'
import { cn } from '@/lib/cn'
import { useAccountStore, useBudgetStore, useFinanceCategoryStore, useTransactionStore } from './store/financeStores'
import { AccountsStrip } from './ui/AccountsStrip'
import { Amount } from './ui/Amount'
import { CashFlowChart } from './ui/CashFlowChart'
import { CategoryBars } from './ui/CategoryBars'
import { InsightList } from './ui/InsightList'

interface StatProps {
  label: string
  children: React.ReactNode
  note?: string
}

function Stat({ label, children, note }: StatProps) {
  return (
    <div className="rounded-card border bg-surface p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={cn('mt-1 text-lg font-bold tracking-tight')}>{children}</p>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
    </div>
  )
}

export function OverviewTab({ month, today }: { month: string; today: string }) {
  const accounts = useAccountStore((s) => s.items)
  const categories = useFinanceCategoryStore((s) => s.items)
  const txs = useTransactionStore((s) => s.items)
  const budgets = useBudgetStore((s) => s.items)

  const data = useMemo(() => {
    const balances = accountBalances(accounts, txs)
    return {
      balances,
      net: netBalance(balances, txs),
      summary: monthSummary(txs, month),
      series: monthlySeries(txs, month, 6),
      totals: categoryTotals(txs, month, 'expense'),
      insights: buildInsights({ txs, budgets, categories, month, today }),
    }
  }, [accounts, categories, txs, budgets, month, today])
  const { summary } = data

  return (
    <div className="space-y-4">
      <AccountsStrip balances={data.balances} net={data.net} />
      <section aria-label="Ringkasan bulan" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pemasukan">
          <Amount minor={summary.incomeMinor} signed={summary.incomeMinor > 0} />
        </Stat>
        <Stat label="Pengeluaran">
          <Amount minor={summary.expenseMinor} />
        </Stat>
        <Stat label="Selisih">
          <Amount minor={summary.netMinor} signed />
        </Stat>
        <Stat label="Tingkat tabungan" note={summary.savingsRatePct === null ? 'Belum ada pemasukan bulan ini' : undefined}>
          {summary.savingsRatePct === null ? <span className="text-muted">-</span> : <span className="tabular-nums">{Math.round(summary.savingsRatePct)}%</span>}
        </Stat>
      </section>
      {summary.unconvertible > 0 && (
        <p className="text-xs text-muted">
          {summary.unconvertible} transaksi belum masuk hitungan karena kurs ke rupiah belum diisi. Buka transaksinya dan lengkapi kurs.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <CashFlowChart series={data.series} selected={month} />
        <CategoryBars totals={data.totals} categories={categories} />
      </div>
      <InsightList insights={data.insights} />
    </div>
  )
}
