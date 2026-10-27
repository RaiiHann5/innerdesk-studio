import { planCopyBudgets } from '@/lib/financeBudgets'
import { advanceNextDate, recurringToDraft } from '@/lib/financeRecurring'
import { validateTransaction } from '@/lib/financeValidate'
import { toastWithRetry } from '@/stores/retryToast'
import { useUiStore } from '@/stores/ui'
import type { Goal, Recurring } from '@/types/domain'
import { useAccountStore, useBudgetStore, useFinanceCategoryStore, useGoalStore, useRecurringStore, useTransactionStore } from './store/financeStores'

/** Sets the limit for a category in a month: updates the budget that exists, otherwise adds one. Never makes a second. */
export async function saveBudgetLimit(month: string, categoryId: string, limitMinor: number): Promise<void> {
  const store = useBudgetStore.getState()
  const existing = store.items.find((b) => b.month === month && b.categoryId === categoryId)
  if (existing) await store.update(existing.id, { limitMinor })
  else await store.add({ month, categoryId, limitMinor })
}

/** Copies last month's limits into `month`, leaving categories that already have one. Returns how many were added. */
export async function copyBudgetsFrom(fromMonth: string, month: string): Promise<number> {
  const plan = planCopyBudgets(useBudgetStore.getState().items, fromMonth, month)
  for (const input of plan.toCreate) await useBudgetStore.getState().add(input)
  return plan.toCreate.length
}

export async function addContribution(goal: Goal, input: { date: string; amountMinor: number; note?: string }): Promise<void> {
  const contribution = { id: crypto.randomUUID(), ...input }
  await useGoalStore.getState().update(goal.id, { contributions: [...goal.contributions, contribution] })
}

export async function removeContribution(goal: Goal, contributionId: string): Promise<void> {
  await useGoalStore.getState().update(goal.id, { contributions: goal.contributions.filter((c) => c.id !== contributionId) })
}

/** Archives a goal and offers one undo. Contributions stay on it. */
export async function archiveGoal(goal: Goal): Promise<void> {
  try {
    await useGoalStore.getState().update(goal.id, { archivedAt: new Date().toISOString() })
  } catch {
    toastWithRetry('Target gagal diarsipkan.', () => archiveGoal(goal))
    return
  }
  useUiStore.getState().showToast('Target diarsipkan.', { label: 'Urungkan', run: () => void useGoalStore.getState().update(goal.id, { archivedAt: undefined }) })
}

async function advance(r: Recurring): Promise<void> {
  try {
    await useRecurringStore.getState().update(r.id, { nextDate: advanceNextDate(r.nextDate, r.freq, r.interval) })
  } catch {
    // The transaction is already saved. Retrying only moves the date, so nothing is recorded twice.
    toastWithRetry('Transaksi dicatat, tapi tanggal tagihan belum maju.', () => advance(r))
  }
}

/**
 * Records one bill by hand (never automatic), then moves its next date forward one period.
 * Returns an error message to show, or null when recorded.
 */
export async function recordRecurring(r: Recurring, today: string): Promise<string | null> {
  const result = recurringToDraft(r, today, useTransactionStore.getState().items)
  if ('error' in result) return result.error
  const issues = validateTransaction(result.draft, useAccountStore.getState().items, useFinanceCategoryStore.getState().items)
  if (issues.length) return issues[0].message
  try {
    await useTransactionStore.getState().add(result.draft)
  } catch {
    return 'Transaksi gagal disimpan. Coba lagi.'
  }
  useUiStore.getState().showToast(`${r.name} dicatat.`)
  await advance(r)
  return null
}
