import { advanceNextDate } from '@/lib/financeRecurring'
import type { Recurring } from '@/types/domain'

export interface BillChip {
  /** Stable per bill and date, so the calendar can never show the same occurrence twice. */
  id: string
  recurringId: string
  date: string
  title: string
  amountMinor: number
  currency: Recurring['currency']
}

const MAX_STEPS = 400

/**
 * Upcoming bills as all-day chips between `from` and `to` (yyyy-MM-dd, inclusive). Each occurrence is counted from the
 * stored next date, not from the one before, so a month-end bill does not drift. Once a bill is recorded its next date
 * moves on and the recorded occurrence leaves the calendar by itself.
 */
export function billChips(items: Recurring[], from: string, to: string): BillChip[] {
  const chips: BillChip[] = []
  for (const r of items) {
    if (!r.active) continue
    for (let k = 0; k < MAX_STEPS; k++) {
      const date = k === 0 ? r.nextDate : advanceNextDate(r.nextDate, r.freq, r.interval * k)
      if (date > to) break
      if (date >= from) chips.push({ id: `bill:${r.id}:${date}`, recurringId: r.id, date, title: r.name, amountMinor: r.amountMinor, currency: r.currency })
    }
  }
  return chips.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
}
