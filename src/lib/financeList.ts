import { BASE_CURRENCY } from '@/lib/config'
import { baseAmountOf } from '@/lib/financeSelectors'
import { sumMinor } from '@/lib/money'
import type { Account, FinanceCategory, Transaction, TransactionKind } from '@/types/domain'

export type TransactionSort = 'terbaru' | 'terlama' | 'terbesar' | 'terkecil'

export interface TransactionFilters {
  query: string
  kind: 'all' | TransactionKind
  accountId: string
  /** A category id, "none" for uncategorized, or "" for any. */
  categoryId: string
  projectId: string
  tag: string
  /** yyyy-MM-dd, inclusive. */
  from: string
  to: string
}

export const NO_FILTERS: TransactionFilters = { query: '', kind: 'all', accountId: '', categoryId: '', projectId: '', tag: '', from: '', to: '' }

/** How many filters are set (the search text and the date range count once each). */
export function activeFilterCount(f: TransactionFilters): number {
  return [f.query.trim(), f.kind !== 'all', f.accountId, f.categoryId, f.projectId, f.tag, f.from || f.to].filter(Boolean).length
}

interface ListContext {
  accounts: Account[]
  categories: FinanceCategory[]
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD')

/** Search matches the note, payee, tags, category and account names. A transfer matches either account. */
export function filterTransactions(txs: Transaction[], f: TransactionFilters, ctx: ListContext): Transaction[] {
  const accountName = new Map(ctx.accounts.map((a) => [a.id, a.name]))
  const categoryName = new Map(ctx.categories.map((c) => [c.id, c.name]))
  const words = norm(f.query).split(/\s+/).filter(Boolean)
  return txs.filter((tx) => {
    if (f.kind !== 'all' && tx.kind !== f.kind) return false
    if (f.accountId && tx.accountId !== f.accountId && tx.toAccountId !== f.accountId) return false
    if (f.categoryId === 'none' ? tx.categoryId || tx.kind === 'transfer' : f.categoryId && tx.categoryId !== f.categoryId) return false
    if (f.projectId && tx.projectId !== f.projectId) return false
    if (f.tag && !tx.tags.includes(f.tag)) return false
    if (f.from && tx.date < f.from) return false
    if (f.to && tx.date > f.to) return false
    if (!words.length) return true
    const haystack = norm(
      [tx.note, tx.payee, ...tx.tags, tx.categoryId && categoryName.get(tx.categoryId), accountName.get(tx.accountId), tx.toAccountId && accountName.get(tx.toAccountId)]
        .filter(Boolean)
        .join(' '),
    )
    return words.every((w) => haystack.includes(w))
  })
}

/** What an amount sort compares: the base amount, so USD and rupiah rank fairly. A transfer ranks by its own amount. */
const sortAmount = (tx: Transaction): number => baseAmountOf(tx, BASE_CURRENCY) ?? (tx.currency === BASE_CURRENCY ? tx.amountMinor : 0)

export function sortTransactions(txs: Transaction[], sort: TransactionSort): Transaction[] {
  const byNewest = (a: Transaction, b: Transaction) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)
  const out = [...txs]
  if (sort === 'terbaru') return out.sort(byNewest)
  if (sort === 'terlama') return out.sort((a, b) => -byNewest(a, b))
  return out.sort((a, b) => (sort === 'terbesar' ? sortAmount(b) - sortAmount(a) : sortAmount(a) - sortAmount(b)) || byNewest(a, b))
}

export interface DayGroup {
  date: string
  items: Transaction[]
  incomeMinor: number
  expenseMinor: number
  /** Income less expense in the base currency. Transfers are not in it. */
  netMinor: number
}

/** Groups an already sorted list by day, keeping its order, with each day's subtotal. */
export function groupByDay(txs: Transaction[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const tx of txs) {
    let group = groups[groups.length - 1]
    if (!group || group.date !== tx.date) {
      group = { date: tx.date, items: [], incomeMinor: 0, expenseMinor: 0, netMinor: 0 }
      groups.push(group)
    }
    group.items.push(tx)
  }
  for (const g of groups) {
    const amounts = (kind: 'income' | 'expense') => g.items.filter((t) => t.kind === kind).map((t) => baseAmountOf(t) ?? 0)
    g.incomeMinor = sumMinor(amounts('income'))
    g.expenseMinor = sumMinor(amounts('expense'))
    g.netMinor = g.incomeMinor - g.expenseMinor
  }
  return groups
}

/** Every tag in use, sorted, for the tag filter. */
export const allTags = (txs: Transaction[]): string[] => [...new Set(txs.flatMap((t) => t.tags))].sort((a, b) => a.localeCompare(b))
