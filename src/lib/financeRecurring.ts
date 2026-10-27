import { BASE_CURRENCY } from '@/lib/config'
import { addDaysIso, dayOfMonth, daysInMonth, monthOf, shiftMonth } from '@/lib/financeDates'
import { lastRateFor } from '@/lib/financeSelectors'
import { toBase } from '@/lib/money'
import type { Recurring, NewEntity, Transaction } from '@/types/domain'

/**
 * The date after `date` for a schedule. Monthly and yearly clamp to the end of a shorter month (31 Jan + 1 month
 * is 28 or 29 Feb). Known limit: with no stored anchor day, a bill that clamped keeps the clamped day afterwards.
 * If Phase 1 already has a next-date function, make this one re-export it.
 */
export function advanceNextDate(date: string, freq: Recurring['freq'], interval: number): string {
  const n = Math.max(1, Math.floor(interval))
  if (freq === 'weekly') return addDaysIso(date, 7 * n)
  const month = shiftMonth(monthOf(date), freq === 'yearly' ? 12 * n : n)
  const day = Math.min(dayOfMonth(date), daysInMonth(month))
  return `${month}-${String(day).padStart(2, '0')}`
}

export type RecurringDraft = { draft: NewEntity<Transaction> } | { error: string }

/**
 * The transaction "Catat" would create. Dated on the due date, or today when recorded early. A foreign bill uses the
 * last rate stored for its currency; without one it is not guessed.
 */
export function recurringToDraft(r: Recurring, today: string, txs: Transaction[]): RecurringDraft {
  const base: NewEntity<Transaction> = {
    date: r.nextDate <= today ? r.nextDate : today,
    kind: r.kind,
    amountMinor: r.amountMinor,
    currency: r.currency,
    accountId: r.accountId,
    categoryId: r.categoryId,
    note: r.name,
    tags: [],
    recurringId: r.id,
  }
  if (r.currency === BASE_CURRENCY) return { draft: base }
  const rate = lastRateFor(r.currency, txs)
  if (rate === null) return { error: `Kurs ${r.currency} belum pernah dicatat. Catat lewat "Catat transaksi" dan isi kurs.` }
  return { draft: { ...base, fx: toBase(r.amountMinor, r.currency, rate, BASE_CURRENCY) } }
}
