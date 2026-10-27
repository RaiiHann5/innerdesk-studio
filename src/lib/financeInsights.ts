import { BASE_CURRENCY } from '@/lib/config'
import { dayOfMonth, daysInMonth, monthOf, shiftMonth } from '@/lib/financeDates'
import { formatMoney } from '@/lib/money'
import { budgetOverview, monthSummary } from '@/lib/financeSelectors'
import type { Budget, CurrencyCode, FinanceCategory, Transaction } from '@/types/domain'

export interface Insight {
  id: 'spend-change' | 'budget-left' | 'savings'
  text: string
  /** False when there was too little to say anything honest: the text then says so. */
  enough: boolean
  /** The text carries a money amount, so the privacy toggle must hide it. */
  hasAmount: boolean
}

export const NOT_ENOUGH = 'belum cukup data'

interface InsightInput {
  txs: Transaction[]
  budgets: Budget[]
  categories: FinanceCategory[]
  month: string
  /** yyyy-MM-dd. Decides whether `month` is still in progress. */
  today: string
  base?: CurrencyCode
}

/**
 * Three plain sentences computed from the shared selectors. None of them guesses: with too little data the
 * sentence says "belum cukup data". A month still in progress is compared with the same days of the month
 * before, because its first half set against a whole month would always look like a drop.
 */
export function buildInsights({ txs, budgets, categories, month, today, base = BASE_CURRENCY }: InsightInput): Insight[] {
  const previous = shiftMonth(month, -1)
  const inProgress = monthOf(today) === month
  const through = inProgress ? Math.min(dayOfMonth(today), daysInMonth(previous)) : undefined
  const current = monthSummary(txs, month, base, inProgress ? dayOfMonth(today) : undefined)
  const before = monthSummary(txs, previous, base, through)
  const against = inProgress ? 'dari bulan lalu pada tanggal yang sama' : 'dari bulan sebelumnya'

  const change: Insight = { id: 'spend-change', text: `Perbandingan pengeluaran: ${NOT_ENOUGH}.`, enough: false, hasAmount: false }
  if (before.expenseMinor > 0 && current.expenseMinor > 0) {
    const pct = Math.round(((current.expenseMinor - before.expenseMinor) * 100) / before.expenseMinor)
    change.enough = true
    change.text =
      pct === 0 ? `Pengeluaran sama dengan ${against}.` : `Pengeluaran ${pct > 0 ? 'naik' : 'turun'} ${Math.abs(pct)}% ${against}.`
  }

  const left: Insight = { id: 'budget-left', text: `Sisa anggaran: ${NOT_ENOUGH}.`, enough: false, hasAmount: false }
  const overview = budgetOverview(budgets, txs, month, base)
  const names = new Map(categories.map((c) => [c.id, c.name.toLowerCase()]))
  // Over-budget lines first, then the one closest to its limit: that is the one worth a sentence.
  const ranked = [...overview.lines].filter((l) => l.budget.limitMinor > 0).sort((a, b) => (b.usedPct ?? 0) - (a.usedPct ?? 0))
  const line = ranked[0]
  if (line) {
    const name = names.get(line.budget.categoryId) ?? 'kategori ini'
    left.enough = true
    left.hasAmount = true
    left.text = line.over
      ? `Anggaran ${name} lewat ${formatMoney(-line.remainingMinor, base, { compact: true, bare: true })}.`
      : `Sisa anggaran ${name} ${formatMoney(line.remainingMinor, base, { compact: true, bare: true })}.`
  }

  const savings: Insight = { id: 'savings', text: `Tingkat tabungan: ${NOT_ENOUGH}.`, enough: false, hasAmount: false }
  if (current.savingsRatePct !== null) {
    const pct = Math.round(current.savingsRatePct)
    savings.enough = true
    savings.text =
      pct >= 0 ? `Sekitar ${pct}% pemasukan bulan ini tersisa.` : `Pengeluaran bulan ini ${Math.abs(pct)}% di atas pemasukan.`
  }
  return [change, left, savings]
}
