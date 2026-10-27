import { describe, expect, it } from 'vitest'
import { planCopyBudgets } from './financeBudgets'
import { makeBudget } from './financeTesting'

describe('planCopyBudgets', () => {
  const sept = [makeBudget({ id: 'a', month: '2026-09', categoryId: 'makan', limitMinor: 1_500_000 }), makeBudget({ id: 'b', month: '2026-09', categoryId: 'transport', limitMinor: 500_000 })]
  it('copies every limit of the source month', () => {
    expect(planCopyBudgets(sept, '2026-09', '2026-10')).toEqual({
      toCreate: [{ month: '2026-10', categoryId: 'makan', limitMinor: 1_500_000 }, { month: '2026-10', categoryId: 'transport', limitMinor: 500_000 }],
      skipped: 0,
    })
  })
  it('never duplicates a category that already has a budget in the target month', () => {
    const plan = planCopyBudgets([...sept, makeBudget({ id: 'c', month: '2026-10', categoryId: 'makan', limitMinor: 1_000_000 })], '2026-09', '2026-10')
    expect(plan.toCreate.map((b) => b.categoryId)).toEqual(['transport'])
    expect(plan.skipped).toBe(1)
  })
  it('copies a category once even if the source month has it twice, and skips zero limits', () => {
    const plan = planCopyBudgets([...sept, makeBudget({ id: 'd', month: '2026-09', categoryId: 'makan', limitMinor: 9 }), makeBudget({ id: 'e', month: '2026-09', categoryId: 'hiburan', limitMinor: 0 })], '2026-09', '2026-10')
    expect(plan.toCreate).toHaveLength(2)
    expect(plan.skipped).toBe(2)
  })
  it('does nothing when the source month is empty', () => expect(planCopyBudgets(sept, '2026-05', '2026-10')).toEqual({ toCreate: [], skipped: 0 }))
})
