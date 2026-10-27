import { BASE_CURRENCY } from '@/lib/config'
import type { parseFinanceCapture } from '@/lib/financeCapture'
import { lastRateFor } from '@/lib/financeSelectors'
import { toBase } from '@/lib/money'
import type { Account, NewEntity, Transaction } from '@/types/domain'
import { defaultAccountId } from './defaults'

export type CaptureDraft = NewEntity<Transaction> | { open: Partial<NewEntity<Transaction>> } | { error: string }

/**
 * Turns a parsed capture line into something saveable. Shared by the quick-add bar and the command palette so both
 * pick the same account and use the same rate. A foreign amount with no stored rate is handed back as `open`: the
 * rate is never guessed.
 */
export function buildCaptureDraft(parsed: ReturnType<typeof parseFinanceCapture>, accounts: Account[], txs: Transaction[]): CaptureDraft {
  if (parsed.amountMinor === null) return { error: 'Tulis nominalnya, misalnya 35rb.' }
  const account = accounts.find((a) => a.id === (parsed.accountId ?? defaultAccountId(txs, accounts, parsed.currency)))
  if (!account) return { error: 'Belum ada akun. Tambahkan akun dulu.' }
  const base = {
    date: parsed.date,
    kind: parsed.kind,
    amountMinor: parsed.amountMinor,
    currency: parsed.currency,
    accountId: account.id,
    categoryId: parsed.categoryId,
    note: parsed.note || undefined,
    tags: [] as string[],
  }
  if (parsed.currency === BASE_CURRENCY) return base
  const rate = lastRateFor(parsed.currency, txs)
  if (rate === null) return { open: base }
  return { ...base, fx: toBase(parsed.amountMinor, parsed.currency, rate, BASE_CURRENCY) }
}
