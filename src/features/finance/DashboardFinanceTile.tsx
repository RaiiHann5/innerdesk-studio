import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Wallet } from '@phosphor-icons/react'
import { StoreGate } from '@/components/ui/StoreGate'
import { Skeleton } from '@/components/ui/Skeleton'
import { isoDay } from '@/lib/date'
import { monthOf } from '@/lib/financeDates'
import { budgetOverview, monthSummary } from '@/lib/financeSelectors'
import { FINANCE_STORES, loadFinance, useBudgetStore, useTransactionStore } from './store/financeStores'
import { Amount } from './ui/Amount'

function Body() {
  const txs = useTransactionStore((s) => s.items)
  const budgets = useBudgetStore((s) => s.items)
  const month = monthOf(isoDay(0))
  const { net, overview } = useMemo(() => ({ net: monthSummary(txs, month).netMinor, overview: budgetOverview(budgets, txs, month) }), [txs, budgets, month])
  return (
    <dl className="mt-2 space-y-1.5 text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-muted">Selisih bulan ini</dt>
        <dd className="text-base font-bold">
          <Amount minor={net} signed spoken="selisih" />
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-muted">Sisa anggaran</dt>
        <dd>{overview.lines.length === 0 ? <span className="text-muted">Belum diatur</span> : overview.remainingMinor < 0 ? <span className="text-status-overdue">Lewat <Amount minor={-overview.remainingMinor} /></span> : <Amount minor={overview.remainingMinor} spoken="sisa anggaran" />}</dd>
      </div>
    </dl>
  )
}

/** One small ambient tile for the dashboard. Loads finance only when it is on screen, and obeys the privacy toggle. */
export function DashboardFinanceTile() {
  useEffect(() => {
    void loadFinance()
  }, [])
  return (
    <section aria-label="Keuangan bulan ini" className="rounded-card border bg-surface p-4">
      <h3 className="flex items-center justify-between text-sm font-bold">
        <Link to="/finance" className="inline-flex items-center gap-1.5 rounded-control hover:text-accent-text">
          <Wallet aria-hidden /> Keuangan
        </Link>
      </h3>
      <StoreGate stores={FINANCE_STORES} skeleton={<Skeleton className="mt-2 h-12 w-full" />}>
        <Body />
      </StoreGate>
    </section>
  )
}
