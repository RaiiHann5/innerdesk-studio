import { BASE_CURRENCY } from '@/lib/config'
import { isIsoDate } from '@/lib/financeDates'
import { isMinor } from '@/lib/money'
import type { Account, FinanceCategory, NewEntity, Transaction } from '@/types/domain'

export interface TransactionIssue {
  field: 'amount' | 'date' | 'account' | 'toAccount' | 'toAmount' | 'fx' | 'category' | 'currency'
  message: string
}

/**
 * What stops a transaction from being saved. One list shared by the editor, quick add, the command palette,
 * CSV import and "Catat" on a bill, so a transaction that gets in by one door would get in by all of them.
 * Messages are written for the person; the first one is the one to show when only one fits.
 */
export function validateTransaction(tx: NewEntity<Transaction>, accounts: Account[], categories: FinanceCategory[]): TransactionIssue[] {
  const issues: TransactionIssue[] = []
  const add = (field: TransactionIssue['field'], message: string) => issues.push({ field, message })

  if (!isMinor(tx.amountMinor) || tx.amountMinor <= 0) add('amount', 'Nominal harus lebih dari 0.')
  if (!isIsoDate(tx.date)) add('date', 'Tanggal tidak valid.')

  const account = accounts.find((a) => a.id === tx.accountId)
  if (!tx.accountId || !account) add('account', tx.kind === 'transfer' ? 'Pilih akun asal.' : 'Pilih akun.')
  else if (account.currency !== tx.currency) add('currency', `Mata uang harus sama dengan akun (${account.currency}).`)

  if (tx.kind === 'transfer') {
    const to = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId) : undefined
    if (!tx.toAccountId || !to) add('toAccount', 'Pilih akun tujuan.')
    else if (tx.toAccountId === tx.accountId) add('toAccount', 'Akun tujuan harus berbeda dari akun asal.')
    else if (account && to.currency !== account.currency && !(isMinor(tx.toAmountMinor) && tx.toAmountMinor > 0)) {
      add('toAmount', 'Isi jumlah yang diterima akun tujuan.')
    }
    if (tx.categoryId) add('category', 'Transfer tidak memakai kategori.')
    return issues
  }

  if (tx.currency !== BASE_CURRENCY) {
    const base = tx.fx?.baseAmountMinor
    if (!tx.fx || !(tx.fx.rate > 0) || !isMinor(base) || base <= 0) add('fx', `Isi kurs ke ${BASE_CURRENCY}.`)
  }

  if (tx.categoryId) {
    const category = categories.find((c) => c.id === tx.categoryId)
    if (!category) add('category', 'Kategori tidak ditemukan.')
    else if (category.kind !== tx.kind) add('category', 'Kategori tidak cocok dengan jenis transaksi.')
  }
  return issues
}
