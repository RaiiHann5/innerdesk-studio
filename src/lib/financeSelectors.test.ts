import { describe, expect, it } from 'vitest'
import {
  accountBalances, baseAmountOf, budgetOverview, categoryTotals, goalProgress, lastRateFor, monthSummary, monthlySeries, netBalance, savingsRatePct, spendPerProject, upcomingRecurring,
} from './financeSelectors'
import { makeAccount, makeBudget, makeGoal, makeRecurring, makeTx } from './financeTesting'

const bca = makeAccount({ id: 'bca', openingBalanceMinor: 1_000_000 })
const gopay = makeAccount({ id: 'gopay', name: 'GoPay', openingBalanceMinor: 100_000 })
const paypal = makeAccount({ id: 'paypal', name: 'PayPal USD', currency: 'USD' })
const accounts = [bca, gopay, paypal]
const usdIncome = makeTx({ id: 'u1', kind: 'income', accountId: 'paypal', currency: 'USD', amountMinor: 45_000, fx: { rate: 16_250, baseAmountMinor: 7_312_500 }, date: '2026-09-12' })

describe('baseAmountOf', () => {
  it('uses the amount in the base currency and the stored base amount otherwise', () => {
    expect(baseAmountOf(makeTx())).toBe(10_000)
    expect(baseAmountOf(usdIncome)).toBe(7_312_500)
  })
  it('is null for a transfer and for a foreign amount without a usable fx', () => {
    expect(baseAmountOf(makeTx({ kind: 'transfer' }))).toBeNull()
    expect(baseAmountOf(makeTx({ currency: 'USD', accountId: 'paypal' }))).toBeNull()
    expect(baseAmountOf(makeTx({ currency: 'USD', fx: { rate: 1, baseAmountMinor: 0 } }))).toBeNull()
  })
})

describe('accountBalances', () => {
  const balance = (txs = [] as ReturnType<typeof makeTx>[], asOf?: string) =>
    Object.fromEntries(accountBalances(accounts, txs, asOf).map((b) => [b.account.id, b.balanceMinor]))

  it('starts from the opening balance', () => expect(balance()).toEqual({ bca: 1_000_000, gopay: 100_000, paypal: 0 }))

  it('adds income, subtracts expense, and moves a transfer from one account to the other', () => {
    const txs = [
      makeTx({ id: '1', kind: 'income', accountId: 'bca', amountMinor: 8_000_000 }),
      makeTx({ id: '2', kind: 'expense', accountId: 'bca', amountMinor: 350_000 }),
      makeTx({ id: '3', kind: 'transfer', accountId: 'bca', toAccountId: 'gopay', amountMinor: 500_000 }),
    ]
    expect(balance(txs)).toEqual({ bca: 1_000_000 + 8_000_000 - 350_000 - 500_000, gopay: 600_000, paypal: 0 })
  })

  it('keeps a USD account in USD cents and handles a cross-currency transfer with the received amount', () => {
    const txs = [
      usdIncome,
      makeTx({ id: 't', kind: 'transfer', accountId: 'paypal', currency: 'USD', amountMinor: 30_000, toAccountId: 'bca', toAmountMinor: 4_860_000 }),
    ]
    expect(balance(txs)).toEqual({ bca: 1_000_000 + 4_860_000, gopay: 100_000, paypal: 15_000 })
  })

  it('applies neither side of a transfer that cannot be applied consistently', () => {
    const noReceived = makeTx({ kind: 'transfer', accountId: 'paypal', currency: 'USD', amountMinor: 30_000, toAccountId: 'bca' })
    const self = makeTx({ id: '2', kind: 'transfer', accountId: 'bca', toAccountId: 'bca', amountMinor: 1 })
    const unknown = makeTx({ id: '3', kind: 'transfer', accountId: 'bca', toAccountId: 'ghost', amountMinor: 1 })
    expect(balance([noReceived, self, unknown])).toEqual({ bca: 1_000_000, gopay: 100_000, paypal: 0 })
  })

  it('ignores a transaction whose currency is not its account\'s, and an unknown account', () => {
    expect(balance([makeTx({ accountId: 'bca', currency: 'USD', amountMinor: 5 }), makeTx({ id: '2', accountId: 'ghost' })])).toEqual({ bca: 1_000_000, gopay: 100_000, paypal: 0 })
  })

  it('stops at asOf, inclusive', () => {
    const txs = [makeTx({ id: '1', accountId: 'bca', date: '2026-10-05', amountMinor: 100 }), makeTx({ id: '2', accountId: 'bca', date: '2026-10-06', amountMinor: 200 })]
    expect(balance(txs, '2026-10-05').bca).toBe(999_900)
  })
})

describe('lastRateFor and netBalance', () => {
  it('uses the latest stored rate, and 1 for the base currency', () => {
    const older = makeTx({ id: 'a', currency: 'USD', date: '2026-08-01', fx: { rate: 16_000, baseAmountMinor: 1 } })
    expect(lastRateFor('USD', [older, usdIncome])).toBe(16_250)
    expect(lastRateFor('USD', [])).toBeNull()
    expect(lastRateFor('IDR', [])).toBe(1)
  })

  it('converts a foreign account at the last rate and marks the total approximate', () => {
    const txs = [usdIncome, makeTx({ id: 't', kind: 'transfer', accountId: 'paypal', currency: 'USD', amountMinor: 30_000, toAccountId: 'bca', toAmountMinor: 4_860_000 })]
    const net = netBalance(accountBalances(accounts, txs), txs)
    expect(net).toEqual({ totalMinor: 1_000_000 + 4_860_000 + 100_000 + 2_437_500, approximate: true, missingRates: [] })
  })

  it('leaves out a foreign balance with no rate and says so, and leaves out archived accounts', () => {
    const balances = accountBalances([bca, { ...paypal, openingBalanceMinor: 500 }, { ...gopay, archivedAt: '2026-01-01T00:00:00.000Z' }], [])
    expect(netBalance(balances, [])).toEqual({ totalMinor: 1_000_000, approximate: false, missingRates: ['USD'] })
  })
})

describe('monthSummary', () => {
  const txs = [
    makeTx({ id: '1', kind: 'income', amountMinor: 8_000_000 }),
    makeTx({ id: '2', amountMinor: 2_000_000 }),
    makeTx({ id: '3', kind: 'transfer', amountMinor: 999_999, toAccountId: 'gopay' }),
    makeTx({ id: '4', amountMinor: 55_000, date: '2026-09-30' }),
  ]
  it('counts income and expense of the month and never a transfer', () => {
    expect(monthSummary(txs, '2026-10')).toEqual({ month: '2026-10', incomeMinor: 8_000_000, expenseMinor: 2_000_000, netMinor: 6_000_000, savingsRatePct: 75, count: 2, unconvertible: 0 })
  })
  it('uses the stored base amount, so a later rate never changes an old month', () => {
    expect(monthSummary([usdIncome], '2026-09').incomeMinor).toBe(7_312_500)
    const newer = makeTx({ id: 'n', currency: 'USD', accountId: 'paypal', kind: 'income', amountMinor: 45_000, fx: { rate: 20_000, baseAmountMinor: 9_000_000 }, date: '2026-10-20' })
    expect(monthSummary([usdIncome, newer], '2026-09').incomeMinor).toBe(7_312_500)
  })
  it('counts what it had to leave out', () => {
    const broken = makeTx({ id: 'b', kind: 'income', currency: 'USD', accountId: 'paypal' })
    expect(monthSummary([broken], '2026-10')).toMatchObject({ incomeMinor: 0, count: 0, unconvertible: 1 })
  })
  it('has no savings rate without income and can be negative', () => {
    expect(savingsRatePct(0, 100)).toBeNull()
    expect(savingsRatePct(1_000, 1_500)).toBe(-50)
    expect(savingsRatePct(3, 1)).toBe(66.7)
  })
  it('is zero for an empty month', () => {
    expect(monthSummary([], '2026-10')).toMatchObject({ incomeMinor: 0, expenseMinor: 0, netMinor: 0, savingsRatePct: null })
  })
})

describe('categoryTotals', () => {
  const txs = [
    makeTx({ id: '1', categoryId: 'makan', amountMinor: 300_000 }),
    makeTx({ id: '2', categoryId: 'makan', amountMinor: 100_000 }),
    makeTx({ id: '3', categoryId: 'transport', amountMinor: 400_000 }),
    makeTx({ id: '4', amountMinor: 200_000 }),
    makeTx({ id: '5', kind: 'income', categoryId: 'gaji', amountMinor: 9_000_000 }),
    makeTx({ id: '6', kind: 'transfer', amountMinor: 5_000_000 }),
  ]
  it('groups expense, largest first, with shares and an uncategorized line', () => {
    const rows = categoryTotals(txs, '2026-10')
    expect(rows.map((r) => [r.categoryId, r.totalMinor, r.sharePct, r.count])).toEqual([
      ['makan', 400_000, 40, 2],
      ['transport', 400_000, 40, 1],
      [null, 200_000, 20, 1],
    ])
  })
  it('can list income instead', () => expect(categoryTotals(txs, '2026-10', 'income').map((r) => r.categoryId)).toEqual(['gaji']))
  it('agrees with the month total', () => {
    const sum = categoryTotals(txs, '2026-10').reduce((n, r) => n + r.totalMinor, 0)
    expect(sum).toBe(monthSummary(txs, '2026-10').expenseMinor)
  })
})

describe('budgetOverview', () => {
  const budgets = [
    makeBudget({ id: 'b1', categoryId: 'makan', limitMinor: 1_000_000 }),
    makeBudget({ id: 'b2', categoryId: 'transport', limitMinor: 300_000 }),
    makeBudget({ id: 'b3', categoryId: 'makan', limitMinor: 5, month: '2026-09' }),
    makeBudget({ id: 'b4', categoryId: 'makan', limitMinor: 7 }),
  ]
  const txs = [
    makeTx({ id: '1', categoryId: 'makan', amountMinor: 660_000 }),
    makeTx({ id: '2', categoryId: 'transport', amountMinor: 350_000 }),
    makeTx({ id: '3', categoryId: 'hiburan', amountMinor: 120_000 }),
    makeTx({ id: '4', amountMinor: 45_000 }),
    makeTx({ id: '5', kind: 'transfer', categoryId: 'makan', amountMinor: 9_999_999 }),
  ]
  const overview = budgetOverview(budgets, txs, '2026-10')
  it('reports used, remaining and over per category, for the month only', () => {
    expect(overview.lines.map((l) => [l.budget.categoryId, l.spentMinor, l.remainingMinor, l.over, l.usedPct])).toEqual([
      ['makan', 660_000, 340_000, false, 66],
      ['transport', 350_000, -50_000, true, 116.7],
    ])
  })
  it('totals only budgeted spending and shows the rest apart', () => {
    expect(overview).toMatchObject({ totalLimitMinor: 1_300_000, spentInBudgetsMinor: 1_010_000, remainingMinor: 290_000, uncategorizedMinor: 45_000, unbudgetedMinor: 120_000 })
  })
  it('has no percentage for a zero limit', () => {
    expect(budgetOverview([makeBudget({ limitMinor: 0 })], [], '2026-10').lines[0].usedPct).toBeNull()
  })
})

describe('goalProgress', () => {
  it('sums contributions and caps the percentage', () => {
    const goal = makeGoal({ contributions: [{ id: 'a', date: '2026-09-02', amountMinor: 250_000 }, { id: 'b', date: '2026-10-02', amountMinor: 250_000 }] })
    expect(goalProgress(goal)).toEqual({ contributedMinor: 500_000, targetMinor: 1_000_000, remainingMinor: 500_000, pct: 50, reached: false })
    const over = makeGoal({ contributions: [{ id: 'a', date: '2026-09-02', amountMinor: 1_500_000 }] })
    expect(goalProgress(over)).toMatchObject({ remainingMinor: 0, pct: 100, reached: true })
  })
  it('handles a goal with nothing yet or a zero target', () => {
    expect(goalProgress(makeGoal())).toMatchObject({ contributedMinor: 0, pct: 0, reached: false })
    expect(goalProgress(makeGoal({ targetMinor: 0 }))).toMatchObject({ pct: 0, reached: false })
  })
})

describe('upcomingRecurring', () => {
  const items = [
    makeRecurring({ id: 'far', name: 'Asuransi', nextDate: '2026-12-20' }),
    makeRecurring({ id: 'soon', name: 'Spotify', nextDate: '2026-10-20' }),
    makeRecurring({ id: 'late', name: 'Internet', nextDate: '2026-10-10' }),
    makeRecurring({ id: 'off', name: 'Lama', nextDate: '2026-10-16', active: false }),
    makeRecurring({ id: 'edge', name: 'Tepat 30 hari', nextDate: '2026-11-14' }),
  ]
  it('lists active items inside the horizon with overdue first, soonest first', () => {
    const rows = upcomingRecurring(items, '2026-10-15')
    expect(rows.map((r) => [r.recurring.id, r.daysUntil, r.overdue])).toEqual([['late', -5, true], ['soon', 5, false], ['edge', 30, false]])
  })
})

describe('spendPerProject', () => {
  it('gives income, expense and net per project and ignores transfers and unlinked items', () => {
    const txs = [
      makeTx({ id: '1', kind: 'income', projectId: 'batik', amountMinor: 7_312_500 }),
      makeTx({ id: '2', projectId: 'batik', amountMinor: 480_000 }),
      makeTx({ id: '3', projectId: 'situs', amountMinor: 100_000 }),
      makeTx({ id: '4', kind: 'transfer', projectId: 'batik', amountMinor: 1 }),
      makeTx({ id: '5', amountMinor: 1 }),
    ]
    expect(spendPerProject(txs)).toEqual([
      { projectId: 'batik', incomeMinor: 7_312_500, expenseMinor: 480_000, netMinor: 6_832_500, count: 2 },
      { projectId: 'situs', incomeMinor: 0, expenseMinor: 100_000, netMinor: -100_000, count: 1 },
    ])
  })
})

describe('monthlySeries and monthSummary through a day', () => {
  const txs = [
    makeTx({ id: '1', date: '2026-08-02', amountMinor: 100 }),
    makeTx({ id: '2', date: '2026-10-05', amountMinor: 300 }),
    makeTx({ id: '3', date: '2026-10-20', amountMinor: 700 }),
    makeTx({ id: '4', date: '2026-10-20', kind: 'income', amountMinor: 5_000 }),
  ]
  it('lists months oldest first, ending at the given one, empty months as zeros', () => {
    const series = monthlySeries(txs, '2026-10', 4)
    expect(series.map((m) => m.month)).toEqual(['2026-07', '2026-08', '2026-09', '2026-10'])
    expect(series.map((m) => m.expenseMinor)).toEqual([0, 100, 0, 1_000])
    expect(series[3].incomeMinor).toBe(5_000)
  })
  it('crosses a year boundary', () => {
    expect(monthlySeries([], '2026-02', 3).map((m) => m.month)).toEqual(['2025-12', '2026-01', '2026-02'])
  })
  it('counts only the first days when asked', () => {
    expect(monthSummary(txs, '2026-10', 'IDR', 10)).toMatchObject({ expenseMinor: 300, incomeMinor: 0 })
    expect(monthSummary(txs, '2026-10', 'IDR', 20).expenseMinor).toBe(1_000)
  })
})
