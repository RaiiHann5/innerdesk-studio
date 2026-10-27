import { describe, expect, it } from 'vitest'
import { advanceNextDate, recurringToDraft } from './financeRecurring'
import { makeRecurring, makeTx } from './financeTesting'

describe('advanceNextDate', () => {
  it('moves weekly by 7 days times the interval', () => {
    expect(advanceNextDate('2026-10-28', 'weekly', 1)).toBe('2026-11-04')
    expect(advanceNextDate('2026-10-28', 'weekly', 2)).toBe('2026-11-11')
  })
  it('is month-end safe', () => {
    expect(advanceNextDate('2026-01-31', 'monthly', 1)).toBe('2026-02-28')
    expect(advanceNextDate('2028-01-31', 'monthly', 1)).toBe('2028-02-29')
    expect(advanceNextDate('2026-12-15', 'monthly', 1)).toBe('2027-01-15')
    expect(advanceNextDate('2026-10-31', 'monthly', 3)).toBe('2027-01-31')
  })
  it('handles yearly and a leap day', () => {
    expect(advanceNextDate('2028-02-29', 'yearly', 1)).toBe('2029-02-28')
    expect(advanceNextDate('2026-10-20', 'yearly', 1)).toBe('2027-10-20')
  })
  it('treats an interval below 1 as 1', () => expect(advanceNextDate('2026-10-10', 'monthly', 0)).toBe('2026-11-10'))
})

describe('recurringToDraft', () => {
  const bill = makeRecurring({ id: 'r1', name: 'Internet', amountMinor: 350_000, nextDate: '2026-10-10', accountId: 'bca' })
  it('dates an overdue bill on its due date and an early one today', () => {
    expect(recurringToDraft(bill, '2026-10-15', [])).toMatchObject({ draft: { date: '2026-10-10', amountMinor: 350_000, recurringId: 'r1', note: 'Internet' } })
    expect(recurringToDraft({ ...bill, nextDate: '2026-10-20' }, '2026-10-15', [])).toMatchObject({ draft: { date: '2026-10-15' } })
  })
  it('stores the base amount for a foreign bill from the last rate, and refuses to guess without one', () => {
    const usd = { ...bill, currency: 'USD' as const, amountMinor: 1_000 }
    expect(recurringToDraft(usd, '2026-10-15', [])).toHaveProperty('error')
    const past = makeTx({ currency: 'USD', accountId: 'paypal', fx: { rate: 16_000, baseAmountMinor: 160_000 }, date: '2026-09-01' })
    expect(recurringToDraft(usd, '2026-10-15', [past])).toMatchObject({ draft: { fx: { rate: 16_000, baseAmountMinor: 160_000 } } })
  })
})
