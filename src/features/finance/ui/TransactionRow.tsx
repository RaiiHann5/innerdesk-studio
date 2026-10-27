import { ArrowsLeftRight } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { baseAmountOf } from '@/lib/financeSelectors'
import type { Account, FinanceCategory, Transaction } from '@/types/domain'
import { KIND_LABEL } from '../labels'
import { Amount } from './Amount'

interface TransactionRowProps {
  tx: Transaction
  accounts: Map<string, Account>
  categories: Map<string, FinanceCategory>
  onOpen: (tx: Transaction) => void
}

/**
 * One transaction. Income carries a "+", an expense is plain, a transfer is muted and says which way it went.
 * Amounts line up on the right in tabular figures. A foreign amount shows its rupiah value underneath.
 */
export function TransactionRow({ tx, accounts, categories, onOpen }: TransactionRowProps) {
  const account = accounts.get(tx.accountId)
  const target = tx.toAccountId ? accounts.get(tx.toAccountId) : undefined
  const category = tx.categoryId ? categories.get(tx.categoryId) : undefined
  const transfer = tx.kind === 'transfer'
  const title = tx.note || tx.payee || (transfer ? 'Transfer' : (category?.name ?? KIND_LABEL[tx.kind]))
  const place = transfer ? `${account?.name ?? 'Akun dihapus'} ke ${target?.name ?? 'akun dihapus'}` : (account?.name ?? 'Akun dihapus')
  const label = transfer ? null : (category?.name ?? 'Tanpa kategori')
  const base = baseAmountOf(tx)

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(tx)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-fast hover:bg-sunken"
      >
        {transfer && <ArrowsLeftRight aria-hidden className="shrink-0 text-faint" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-medium">{title}</span>
          <span className="block truncate text-xs text-muted">
            {[label, place, tx.note && tx.payee ? tx.payee : null].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <Amount
            minor={tx.amountMinor}
            currency={tx.currency}
            signed={tx.kind === 'income'}
            spoken={KIND_LABEL[tx.kind].toLowerCase()}
            className={cn('block text-base font-medium', transfer && 'text-muted')}
          />
          {tx.currency !== 'IDR' && base !== null && <Amount minor={base} className="block text-xs text-muted" />}
          {transfer && tx.toAmountMinor !== undefined && target && <Amount minor={tx.toAmountMinor} currency={target.currency} className="block text-xs text-muted" />}
        </span>
      </button>
    </li>
  )
}
