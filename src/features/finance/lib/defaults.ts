import type { Account, CurrencyCode, Transaction } from '@/types/domain'

/** The account of the most recent transaction in that currency if it is still open, otherwise the first open one. */
export function defaultAccountId(txs: Transaction[], accounts: Account[], currency?: CurrencyCode): string | undefined {
  const open = accounts.filter((a) => !a.archivedAt && (!currency || a.currency === currency)).sort((a, b) => a.order - b.order)
  const recent = [...txs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  for (const tx of recent) if (open.some((a) => a.id === tx.accountId)) return tx.accountId
  return open[0]?.id
}
