import { describe, expect, it } from 'vitest'
import { makeAccount, makeFinanceCategory, makeTx } from './financeTesting'
import { validateTransaction } from './financeValidate'

const accounts = [
  makeAccount({ id: 'bca' }),
  makeAccount({ id: 'gopay', name: 'GoPay' }),
  makeAccount({ id: 'paypal', name: 'PayPal', currency: 'USD' }),
]
const categories = [makeFinanceCategory({ id: 'makan' }), makeFinanceCategory({ id: 'gaji', name: 'Gaji', kind: 'income' })]
const { id: _id, createdAt: _c, updatedAt: _u, ...base } = makeTx({ categoryId: 'makan' })
const check = (over: Partial<typeof base> = {}) => validateTransaction({ ...base, ...over }, accounts, categories)
const fields = (over: Partial<typeof base> = {}) => check(over).map((i) => i.field)

describe('validateTransaction', () => {
  it('accepts a plain expense', () => {
    expect(check()).toEqual([])
  })

  it('needs an amount above zero that is a safe whole number', () => {
    expect(check({ amountMinor: 0 })[0]).toEqual({ field: 'amount', message: 'Nominal harus lebih dari 0.' })
    expect(fields({ amountMinor: -5 })).toContain('amount')
    expect(fields({ amountMinor: 1.5 })).toContain('amount')
    expect(fields({ amountMinor: Number.MAX_SAFE_INTEGER + 2 })).toContain('amount')
  })

  it('rejects dates that do not exist', () => {
    expect(fields({ date: '2026-02-30' })).toContain('date')
    expect(fields({ date: '' })).toContain('date')
  })

  it('needs a known account in the same currency as the transaction', () => {
    expect(fields({ accountId: 'ghost' })).toContain('account')
    expect(fields({ currency: 'USD' })).toContain('currency')
  })

  it('wants a stored rate and base amount for a foreign income or expense', () => {
    const usd = { kind: 'income' as const, accountId: 'paypal', currency: 'USD' as const, categoryId: 'gaji' }
    expect(fields(usd)).toEqual(['fx'])
    expect(fields({ ...usd, fx: { rate: 16_250, baseAmountMinor: 0 } })).toEqual(['fx'])
    expect(check({ ...usd, fx: { rate: 16_250, baseAmountMinor: 1_625_000 } })).toEqual([])
  })

  it('keeps transfers apart from categories and requires both sides to make sense', () => {
    const transfer = { kind: 'transfer' as const, categoryId: undefined, toAccountId: 'gopay' }
    expect(check(transfer)).toEqual([])
    expect(fields({ ...transfer, toAccountId: undefined })).toEqual(['toAccount'])
    expect(fields({ ...transfer, toAccountId: 'bca' })).toEqual(['toAccount'])
    expect(fields({ ...transfer, toAccountId: 'ghost' })).toEqual(['toAccount'])
    expect(fields({ ...transfer, categoryId: 'makan' })).toEqual(['category'])
  })

  it('needs the received amount for a transfer between currencies, so no money appears or vanishes', () => {
    const cross = { kind: 'transfer' as const, categoryId: undefined, accountId: 'paypal', currency: 'USD' as const, toAccountId: 'bca', amountMinor: 10_000 }
    expect(check(cross)[0]).toEqual({ field: 'toAmount', message: 'Isi jumlah yang diterima akun tujuan.' })
    expect(check({ ...cross, toAmountMinor: 1_620_000 })).toEqual([])
  })

  it('checks a category exists and matches the kind', () => {
    expect(fields({ categoryId: 'ghost' })).toEqual(['category'])
    expect(fields({ categoryId: 'gaji' })).toEqual(['category'])
  })
})
