import type { Budget, NewEntity } from '@/types/domain'

export interface CopyPlan {
  toCreate: NewEntity<Budget>[]
  /** Categories that already have a budget in the target month, or a limit of zero. They are left alone. */
  skipped: number
}

/**
 * What "Salin dari bulan lalu" would create. A category that already has a budget in the target month is never
 * touched or duplicated, because `budgetOverview` reads only the first budget per (month, category).
 */
export function planCopyBudgets(budgets: Budget[], fromMonth: string, toMonth: string): CopyPlan {
  const taken = new Set(budgets.filter((b) => b.month === toMonth).map((b) => b.categoryId))
  const toCreate: NewEntity<Budget>[] = []
  let skipped = 0
  for (const b of budgets) {
    if (b.month !== fromMonth) continue
    if (taken.has(b.categoryId) || b.limitMinor <= 0) {
      skipped += 1
      continue
    }
    taken.add(b.categoryId)
    toCreate.push({ month: toMonth, categoryId: b.categoryId, limitMinor: b.limitMinor })
  }
  return { toCreate, skipped }
}
