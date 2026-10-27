import { fmt } from '@/lib/date'
import type { MonthSummary } from '@/lib/financeSelectors'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/cn'
import { monthTitle } from '../labels'
import { PrivacyBlur } from './Amount'

const W = 600
const H = 176
const TOP = 22
const BASELINE = 140
const BAR = 24
const GAP = 6

interface CashFlowChartProps {
  /** Oldest first. */
  series: MonthSummary[]
  selected: string
}

/** Income and expense for six months as paired bars. Neutral for income, orange for expense; the chosen month is full strength. */
export function CashFlowChart({ series, selected }: CashFlowChartProps) {
  const max = Math.max(1, ...series.flatMap((m) => [m.incomeMinor, m.expenseMinor]))
  const height = (v: number) => (v === 0 ? 0 : Math.max(2, (v / max) * (BASELINE - TOP)))
  const slot = W / series.length
  const chosen = series.find((m) => m.month === selected)
  const hasData = series.some((m) => m.incomeMinor > 0 || m.expenseMinor > 0)
  const average = Math.round(series.reduce((n, m) => n + m.expenseMinor, 0) / series.length)

  return (
    <section aria-label="Arus kas enam bulan" className="rounded-card border bg-surface p-4">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold">Arus kas 6 bulan</h3>
        <ul className="flex gap-3 text-xs text-muted" aria-label="Keterangan warna">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 bg-faint" /> Pemasukan
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 bg-accent" /> Pengeluaran
          </li>
        </ul>
      </header>
      {!hasData ? (
        <p className="py-10 text-center text-sm text-muted">Belum ada pemasukan atau pengeluaran dalam 6 bulan ini.</p>
      ) : (
        <PrivacyBlur>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Arus kas ${series.length} bulan, dari ${monthTitle(series[0].month)} sampai ${monthTitle(series[series.length - 1].month)}. Rincian ada di tabel di bawah.`}>
            <line x1="0" x2={W} y1={BASELINE} y2={BASELINE} className="stroke-line" strokeWidth="1" />
            {series.map((m, i) => {
              const cx = slot * i + slot / 2
              const on = m.month === selected
              return (
                <g key={m.month} className={cn(!on && 'opacity-50')}>
                  <rect x={cx - BAR - GAP / 2} y={BASELINE - height(m.incomeMinor)} width={BAR} height={height(m.incomeMinor)} className="fill-faint" />
                  <rect x={cx + GAP / 2} y={BASELINE - height(m.expenseMinor)} width={BAR} height={height(m.expenseMinor)} className="fill-accent" />
                  <text x={cx} y={BASELINE + 20} textAnchor="middle" className={cn('text-xs', on ? 'fill-ink font-semibold' : 'fill-muted')}>
                    {fmt(`${m.month}-01`, 'MMM')}
                  </text>
                </g>
              )
            })}
          </svg>
        </PrivacyBlur>
      )}
      {hasData && (
        <PrivacyBlur>
          <p className="mt-2 text-xs text-muted">
            {chosen && (
              <>
                {monthTitle(chosen.month)}: pemasukan <span className="tabular-nums">{formatMoney(chosen.incomeMinor, 'IDR', { compact: true })}</span>, pengeluaran{' '}
                <span className="tabular-nums">{formatMoney(chosen.expenseMinor, 'IDR', { compact: true })}</span>.{' '}
              </>
            )}
            Rata-rata pengeluaran <span className="tabular-nums">{formatMoney(average, 'IDR', { compact: true })}</span> per bulan.
          </p>
        </PrivacyBlur>
      )}
      <table className="sr-only">
        <caption>Pemasukan dan pengeluaran per bulan</caption>
        <thead>
          <tr>
            <th scope="col">Bulan</th>
            <th scope="col">Pemasukan</th>
            <th scope="col">Pengeluaran</th>
          </tr>
        </thead>
        <tbody>
          {series.map((m) => (
            <tr key={m.month}>
              <th scope="row">{monthTitle(m.month)}</th>
              <td>{formatMoney(m.incomeMinor)}</td>
              <td>{formatMoney(m.expenseMinor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
