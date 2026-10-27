import { describe, expect, it } from 'vitest'
import { parseFinanceCapture } from './financeCapture'
import { makeAccount, makeFinanceCategory } from './financeTesting'

const accounts = [
  makeAccount({ id: 'bca', name: 'BCA utama', order: 0 }),
  makeAccount({ id: 'gopay', name: 'GoPay', kind: 'ewallet', order: 1 }),
  makeAccount({ id: 'paypal', name: 'PayPal USD', currency: 'USD', order: 2 }),
]
const categories = [
  makeFinanceCategory({ id: 'makan', name: 'Makan', order: 0 }),
  makeFinanceCategory({ id: 'transport', name: 'Transportasi', order: 1 }),
  makeFinanceCategory({ id: 'gaji', name: 'Gaji', kind: 'income', order: 0 }),
  makeFinanceCategory({ id: 'freelance', name: 'Freelance', kind: 'income', order: 1 }),
]
const now = new Date('2026-10-15T12:00:00')
const parse = (text: string, over: Partial<{ accounts: typeof accounts; categories: typeof categories }> = {}) =>
  parseFinanceCapture(text, { accounts, categories, now, ...over })

describe('parseFinanceCapture', () => {
  it('reads an expense with an amount, a category and a day word', () => {
    expect(parse('makan siang 35rb kemarin')).toEqual({
      kind: 'expense', amountMinor: 35_000, currency: 'IDR', date: '2026-10-14', accountId: undefined, categoryId: 'makan', note: 'makan siang',
    })
  })

  it('reads income and an account from the words', () => {
    expect(parse('gaji 8jt bca')).toMatchObject({ kind: 'income', amountMinor: 8_000_000, accountId: 'bca', categoryId: 'gaji', date: '2026-10-15', note: 'gaji' })
  })

  it('takes a dollar sign as USD and keeps cents in minor units', () => {
    expect(parse('freelance $100 paypal')).toMatchObject({ kind: 'income', currency: 'USD', amountMinor: 10_000, accountId: 'paypal', categoryId: 'freelance' })
    expect(parse('beli buku $12,50')).toMatchObject({ currency: 'USD', amountMinor: 1_250 })
  })

  it('uses the account currency when none is written', () => {
    expect(parse('kopi 5 paypal')).toMatchObject({ currency: 'USD', amountMinor: 500, accountId: 'paypal' })
  })

  it('prefers the clearest amount, so a count is not read as money', () => {
    expect(parse('beli 2 galon 40rb')).toMatchObject({ amountMinor: 40_000, note: 'beli 2 galon' })
    expect(parse('bayar 1.250.000 hari ini')).toMatchObject({ amountMinor: 1_250_000 })
  })

  it('never guesses an amount', () => {
    expect(parse('makan siang')).toMatchObject({ amountMinor: null, note: 'makan siang' })
    expect(parse('')).toMatchObject({ amountMinor: null, note: '' })
  })

  it('understands explicit dates and refuses impossible ones', () => {
    expect(parse('bensin 50rb 2026-10-03').date).toBe('2026-10-03')
    expect(parse('bensin 50rb 3/10').date).toBe('2026-10-03')
    expect(parse('bensin 50rb 31/2').date).toBe('2026-10-15')
    expect(parse('bensin 50rb kemarin lusa').date).toBe('2026-10-13')
  })

  it('finds a category by a common word when the name differs', () => {
    expect(parse('ojek 22rb')).toMatchObject({ categoryId: 'transport' })
    expect(parse('bonus 1jt')).toMatchObject({ kind: 'income' })
  })

  it('leaves out archived accounts and categories', () => {
    const archived = accounts.map((a) => (a.id === 'bca' ? { ...a, archivedAt: '2026-01-01T00:00:00.000Z' } : a))
    expect(parse('gaji 8jt bca', { accounts: archived }).accountId).toBeUndefined()
    const noMakan = categories.map((c) => (c.id === 'makan' ? { ...c, archivedAt: '2026-01-01T00:00:00.000Z' } : c))
    expect(parse('makan 20rb', { categories: noMakan }).categoryId).toBeUndefined()
  })
})
