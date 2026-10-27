import { BASE_CURRENCY } from '@/lib/config'
import { addDaysIso, dayOfMonth, diffDays, monthOf, shiftMonth } from '@/lib/financeDates'
import { convertMinor, isMinor, sumMinor } from '@/lib/money'
import type { Account, Budget, CurrencyCode, Goal, Recurring, Transaction } from '@/types/domain'

/**
 * The one source of truth for every finance number. Pure functions over plain data: Ringkasan, the lists, the
 * dashboard tile and the project tab all call these, so they cannot disagree.
 *
 * Rules every selector follows:
 * - Totals use the base amount stored on the transaction, never a live rate, so old months never change.
 * - Transfers are never income or expense.
 * - A transaction that cannot be converted (foreign currency without a usable fx) is left out and counted in
 *   `unconvertible`, rather than guessed.
 */

/** Base-currency amount of an income or expense, or null when it cannot be known. Transfers have none. */
export function baseAmountOf(tx: Transaction, base: CurrencyCode = BASE_CURRENCY): number | null {
  if (tx.kind === 'transfer') return null
  if (tx.currency === base) return isMinor(tx.amountMinor) ? tx.amountMinor : null
  const converted = tx.fx?.baseAmountMinor
  return isMinor(converted) && converted > 0 ? converted : null
}

export const inMonth = (txs: Transaction[], month: string): Transaction[] => txs.filter((t) => monthOf(t.date) === month)

// ---------------------------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------------------------

export interface AccountBalance {
  account: Account
  /** In the account's own currency. */
  balanceMinor: number
}

/**
 * What a transfer does to each side, or null when it cannot be applied consistently. Both sides apply or
 * neither does, so a broken transfer never creates or destroys money.
 */
function transferLegs(tx: Transaction, from?: Account, to?: Account): { out: number; in: number } | null {
  if (!from || !to || from.id === to.id || tx.currency !== from.currency || !isMinor(tx.amountMinor)) return null
  if (from.currency === to.currency) return { out: tx.amountMinor, in: tx.amountMinor }
  return isMinor(tx.toAmountMinor) && tx.toAmountMinor > 0 ? { out: tx.amountMinor, in: tx.toAmountMinor } : null
}

/** Opening balance plus everything recorded, up to `asOf` (yyyy-MM-dd, inclusive) when given. */
export function accountBalances(accounts: Account[], txs: Transaction[], asOf?: string): AccountBalance[] {
  const byId = new Map(accounts.map((a) => [a.id, a]))
  const delta = new Map<string, number[]>()
  const push = (id: string, n: number) => delta.set(id, [...(delta.get(id) ?? []), n])

  for (const tx of txs) {
    if (asOf && tx.date > asOf) continue
    const account = byId.get(tx.accountId)
    if (tx.kind === 'transfer') {
      const legs = transferLegs(tx, account, tx.toAccountId ? byId.get(tx.toAccountId) : undefined)
      if (!legs || !account || !tx.toAccountId) continue
      push(account.id, -legs.out)
      push(tx.toAccountId, legs.in)
    } else if (account && account.currency === tx.currency && isMinor(tx.amountMinor)) {
      push(account.id, tx.kind === 'income' ? tx.amountMinor : -tx.amountMinor)
    }
  }
  return accounts.map((account) => ({
    account,
    balanceMinor: sumMinor([account.openingBalanceMinor, ...(delta.get(account.id) ?? [])]),
  }))
}

/** The rate most recently used for a currency (latest date, then latest createdAt), or null if none was ever stored. */
export function lastRateFor(currency: CurrencyCode, txs: Transaction[], base: CurrencyCode = BASE_CURRENCY): number | null {
  if (currency === base) return 1
  let best: Transaction | null = null
  for (const tx of txs) {
    if (tx.currency !== currency || !tx.fx || !(tx.fx.rate > 0)) continue
    if (!best || tx.date > best.date || (tx.date === best.date && tx.createdAt > best.createdAt)) best = tx
  }
  return best?.fx?.rate ?? null
}

export interface NetBalance {
  totalMinor: number
  /** True when a foreign account was converted at its last-used rate, so the total moves with the market. */
  approximate: boolean
  /** Foreign currencies that hold money but have no stored rate. Their balances are left out of the total. */
  missingRates: CurrencyCode[]
}

/** Sum of the balances of accounts that are not archived, in the base currency. */
export function netBalance(balances: AccountBalance[], txs: Transaction[], base: CurrencyCode = BASE_CURRENCY): NetBalance {
  const parts: number[] = []
  const missing = new Set<CurrencyCode>()
  let approximate = false
  for (const { account, balanceMinor } of balances) {
    if (account.archivedAt) continue
    if (account.currency === base) {
      parts.push(balanceMinor)
      continue
    }
    if (balanceMinor === 0) continue
    const rate = lastRateFor(account.currency, txs, base)
    if (rate === null) {
      missing.add(account.currency)
      continue
    }
    approximate = true
    parts.push(convertMinor(balanceMinor, account.currency, base, rate))
  }
  return { totalMinor: sumMinor(parts), approximate, missingRates: [...missing] }
}

// ---------------------------------------------------------------------------------------------
// Month
// ---------------------------------------------------------------------------------------------

export interface MonthSummary {
  month: string
  incomeMinor: number
  expenseMinor: number
  netMinor: number
  /** (income - expense) / income as a percentage with one decimal. Null when there was no income. Negative when spending beat income. */
  savingsRatePct: number | null
  /** Income and expense counted, transfers excluded. */
  count: number
  /** Income or expense left out because it has no usable base amount. */
  unconvertible: number
}

export function savingsRatePct(incomeMinor: number, expenseMinor: number): number | null {
  if (incomeMinor <= 0) return null
  return Math.round(((incomeMinor - expenseMinor) * 1000) / incomeMinor) / 10
}

/**
 * Totals of one month. With `throughDay`, only days 1..throughDay count, so a month in progress can be compared with
 * the same stretch of the month before instead of with a whole one.
 */
export function monthSummary(txs: Transaction[], month: string, base: CurrencyCode = BASE_CURRENCY, throughDay?: number): MonthSummary {
  const income: number[] = []
  const expense: number[] = []
  let unconvertible = 0
  for (const tx of inMonth(txs, month)) {
    if (tx.kind === 'transfer') continue
    if (throughDay !== undefined && dayOfMonth(tx.date) > throughDay) continue
    const amount = baseAmountOf(tx, base)
    if (amount === null) {
      unconvertible += 1
      continue
    }
    ;(tx.kind === 'income' ? income : expense).push(amount)
  }
  const incomeMinor = sumMinor(income)
  const expenseMinor = sumMinor(expense)
  return {
    month,
    incomeMinor,
    expenseMinor,
    netMinor: incomeMinor - expenseMinor,
    savingsRatePct: savingsRatePct(incomeMinor, expenseMinor),
    count: income.length + expense.length,
    unconvertible,
  }
}

/** `count` months ending at `endMonth` (inclusive), oldest first. Months with nothing in them are zeros, not gaps. */
export function monthlySeries(txs: Transaction[], endMonth: string, count: number, base: CurrencyCode = BASE_CURRENCY): MonthSummary[] {
  return Array.from({ length: count }, (_, i) => monthSummary(txs, shiftMonth(endMonth, i - (count - 1)), base))
}

export interface CategoryTotal {
  /** Null is the "tanpa kategori" line. */
  categoryId: string | null
  totalMinor: number
  /** Share of the month's total of that kind, one decimal. */
  sharePct: number
  count: number
}

/** A month's income or expense by category, largest first. Uncategorized spending is its own line (`categoryId` null). */
export function categoryTotals(
  txs: Transaction[],
  month: string,
  kind: 'income' | 'expense' = 'expense',
  base: CurrencyCode = BASE_CURRENCY,
): CategoryTotal[] {
  const groups = new Map<string | null, number[]>()
  for (const tx of inMonth(txs, month)) {
    if (tx.kind !== kind) continue
    const amount = baseAmountOf(tx, base)
    if (amount === null) continue
    const key = tx.categoryId ?? null
    groups.set(key, [...(groups.get(key) ?? []), amount])
  }
  const rows = [...groups].map(([categoryId, amounts]) => ({ categoryId, totalMinor: sumMinor(amounts), count: amounts.length }))
  const grand = sumMinor(rows.map((r) => r.totalMinor))
  return rows
    .map((r) => ({ ...r, sharePct: grand > 0 ? Math.round((r.totalMinor * 1000) / grand) / 10 : 0 }))
    .sort((a, b) => b.totalMinor - a.totalMinor || String(a.categoryId).localeCompare(String(b.categoryId)))
}

// ---------------------------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------------------------

export interface BudgetLine {
  budget: Budget
  spentMinor: number
  /** Limit minus spent. Negative when over budget. */
  remainingMinor: number
  over: boolean
  /** Spent as a share of the limit, one decimal, can pass 100. Null for a zero limit. */
  usedPct: number | null
}

export interface BudgetOverview {
  month: string
  lines: BudgetLine[]
  totalLimitMinor: number
  /** Spent in categories that have a budget this month. */
  spentInBudgetsMinor: number
  remainingMinor: number
  /** Expense with no category. */
  uncategorizedMinor: number
  /** Expense in categories that have no budget this month. */
  unbudgetedMinor: number
}

/** If a category has two budgets for one month, the first one is used. Writing code must keep (month, category) unique. */
export function budgetOverview(budgets: Budget[], txs: Transaction[], month: string, base: CurrencyCode = BASE_CURRENCY): BudgetOverview {
  const spent = new Map<string | null, number[]>()
  for (const tx of inMonth(txs, month)) {
    if (tx.kind !== 'expense') continue
    const amount = baseAmountOf(tx, base)
    if (amount === null) continue
    const key = tx.categoryId ?? null
    spent.set(key, [...(spent.get(key) ?? []), amount])
  }
  const seen = new Set<string>()
  const lines: BudgetLine[] = []
  for (const budget of budgets) {
    if (budget.month !== month || seen.has(budget.categoryId)) continue
    seen.add(budget.categoryId)
    const spentMinor = sumMinor(spent.get(budget.categoryId) ?? [])
    lines.push({
      budget,
      spentMinor,
      remainingMinor: budget.limitMinor - spentMinor,
      over: spentMinor > budget.limitMinor,
      usedPct: budget.limitMinor > 0 ? Math.round((spentMinor * 1000) / budget.limitMinor) / 10 : null,
    })
  }
  const totalLimitMinor = sumMinor(lines.map((l) => l.budget.limitMinor))
  const spentInBudgetsMinor = sumMinor(lines.map((l) => l.spentMinor))
  const unbudgeted = [...spent].filter(([key]) => key !== null && !seen.has(key)).flatMap(([, amounts]) => amounts)
  return {
    month,
    lines,
    totalLimitMinor,
    spentInBudgetsMinor,
    remainingMinor: totalLimitMinor - spentInBudgetsMinor,
    uncategorizedMinor: sumMinor(spent.get(null) ?? []),
    unbudgetedMinor: sumMinor(unbudgeted),
  }
}

// ---------------------------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------------------------

export interface GoalProgress {
  contributedMinor: number
  targetMinor: number
  remainingMinor: number
  /** 0 to 100, one decimal. */
  pct: number
  reached: boolean
}

export function goalProgress(goal: Goal): GoalProgress {
  const contributedMinor = sumMinor(goal.contributions.map((c) => c.amountMinor))
  const target = goal.targetMinor
  return {
    contributedMinor,
    targetMinor: target,
    remainingMinor: Math.max(0, target - contributedMinor),
    pct: target > 0 ? Math.min(100, Math.round((contributedMinor * 1000) / target) / 10) : 0,
    reached: target > 0 && contributedMinor >= target,
  }
}

// ---------------------------------------------------------------------------------------------
// Recurring
// ---------------------------------------------------------------------------------------------

export interface UpcomingRecurring {
  recurring: Recurring
  dueDate: string
  /** Negative when the date has passed and the bill is not recorded yet. */
  daysUntil: number
  overdue: boolean
}

/** Active items due within `horizonDays` of today, plus any that are overdue. The soonest comes first. */
export function upcomingRecurring(items: Recurring[], today: string, horizonDays = 30): UpcomingRecurring[] {
  const limit = addDaysIso(today, horizonDays)
  return items
    .filter((r) => r.active && r.nextDate <= limit)
    .map((recurring) => {
      const daysUntil = diffDays(today, recurring.nextDate)
      return { recurring, dueDate: recurring.nextDate, daysUntil, overdue: daysUntil < 0 }
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.recurring.name.localeCompare(b.recurring.name))
}

// ---------------------------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------------------------

export interface ProjectFinance {
  projectId: string
  incomeMinor: number
  expenseMinor: number
  netMinor: number
  count: number
}

/** Income and expense per project over all time, ordered by project id. Transactions without a project are not listed. */
export function spendPerProject(txs: Transaction[], base: CurrencyCode = BASE_CURRENCY): ProjectFinance[] {
  const groups = new Map<string, { income: number[]; expense: number[] }>()
  for (const tx of txs) {
    if (!tx.projectId || tx.kind === 'transfer') continue
    const amount = baseAmountOf(tx, base)
    if (amount === null) continue
    const group = groups.get(tx.projectId) ?? { income: [], expense: [] }
    group[tx.kind].push(amount)
    groups.set(tx.projectId, group)
  }
  return [...groups]
    .map(([projectId, g]) => {
      const incomeMinor = sumMinor(g.income)
      const expenseMinor = sumMinor(g.expense)
      return { projectId, incomeMinor, expenseMinor, netMinor: incomeMinor - expenseMinor, count: g.income.length + g.expense.length }
    })
    .sort((a, b) => a.projectId.localeCompare(b.projectId))
}
