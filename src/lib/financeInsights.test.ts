import { describe, expect, it } from 'vitest'
import { buildInsights, NOT_ENOUGH } from './financeInsights'
import { makeBudget, makeFinanceCategory, makeTx } from './financeTesting'

const categories = [makeFinanceCategory({ id: 'makan', name: 'Makan' }), makeFinanceCategory({ id: 'transport', name: 'Transport' })]
const run = (txs: ReturnType<typeof makeTx>[], budgets = [] as ReturnType<typeof makeBudget>[], month = '2026-10', today = '2026-10-15') =>
  Object.fromEntries(buildInsights({ txs, budgets, categories, month, today }).map((i) => [i.id, i]))

describe('buildInsights', () => {
  it('says there is not enough data instead of guessing', () => {
    const r = run([])
    for (const insight of Object.values(r)) {
      expect(insight.enough).toBe(false)
      expect(insight.text).toContain(NOT_ENOUGH)
    }
  })

  it('compares a month in progress with the same days of the month before', () => {
    const txs = [
      makeTx({ id: '1', date: '2026-09-03', amountMinor: 100_000 }),
      makeTx({ id: '2', date: '2026-09-14', amountMinor: 100_000 }),
      // After the 15th of September: must not count against October's first half.
      makeTx({ id: '3', date: '2026-09-25', amountMinor: 900_000 }),
      makeTx({ id: '4', date: '2026-10-05', amountMinor: 224_000 }),
    ]
    expect(run(txs)['spend-change'].text).toBe('Pengeluaran naik 12% dari bulan lalu pada tanggal yang sama.')
  })

  it('compares whole months for a month that is over', () => {
    const txs = [makeTx({ id: '1', date: '2026-08-03', amountMinor: 200_000 }), makeTx({ id: '2', date: '2026-09-03', amountMinor: 150_000 })]
    expect(run(txs, [], '2026-09')['spend-change'].text).toBe('Pengeluaran turun 25% dari bulan sebelumnya.')
  })

  it('needs spending in both periods', () => {
    expect(run([makeTx({ date: '2026-10-05' })])['spend-change'].enough).toBe(false)
  })

  it('names the budget closest to its limit and what is left', () => {
    const budgets = [makeBudget({ id: 'a', categoryId: 'makan', limitMinor: 1_000_000 }), makeBudget({ id: 'b', categoryId: 'transport', limitMinor: 400_000 })]
    const txs = [makeTx({ id: '1', categoryId: 'makan', amountMinor: 660_000 }), makeTx({ id: '2', categoryId: 'transport', amountMinor: 100_000 })]
    const r = run(txs, budgets)['budget-left']
    expect(r).toMatchObject({ text: 'Sisa anggaran makan 340 rb.', enough: true, hasAmount: true })
  })

  it('says so when a budget is exceeded', () => {
    const budgets = [makeBudget({ categoryId: 'transport', limitMinor: 300_000 })]
    expect(run([makeTx({ categoryId: 'transport', amountMinor: 350_000 })], budgets)['budget-left'].text).toBe('Anggaran transport lewat 50 rb.')
  })

  it('reports the savings rate, and spending above income', () => {
    const rich = [makeTx({ id: '1', kind: 'income', amountMinor: 8_000_000 }), makeTx({ id: '2', amountMinor: 2_000_000 })]
    expect(run(rich).savings.text).toBe('Sekitar 75% pemasukan bulan ini tersisa.')
    const poor = [makeTx({ id: '1', kind: 'income', amountMinor: 1_000_000 }), makeTx({ id: '2', amountMinor: 1_500_000 })]
    expect(run(poor).savings.text).toBe('Pengeluaran bulan ini 50% di atas pemasukan.')
  })
})
