import { describe, expect, it } from 'vitest'
import { NO_FILTERS, activeFilterCount, allTags, filterTransactions, groupByDay, sortTransactions } from './financeList'
import { makeAccount, makeFinanceCategory, makeTx } from './financeTesting'

const accounts = [makeAccount({ id: 'bca', name: 'BCA utama' }), makeAccount({ id: 'gopay', name: 'GoPay' })]
const categories = [makeFinanceCategory({ id: 'makan', name: 'Makan' }), makeFinanceCategory({ id: 'gaji', name: 'Gaji', kind: 'income' })]
const ctx = { accounts, categories }
const txs = [
  makeTx({ id: '1', date: '2026-10-05', accountId: 'bca', categoryId: 'makan', note: 'Makan siang warteg', amountMinor: 28_000, tags: ['kantor'] }),
  makeTx({ id: '2', date: '2026-10-05', accountId: 'gopay', amountMinor: 18_000, note: 'Gojek ke kantor', payee: 'Gojek' }),
  makeTx({ id: '3', date: '2026-10-01', accountId: 'bca', kind: 'income', categoryId: 'gaji', amountMinor: 8_000_000, projectId: 'prj' }),
  makeTx({ id: '4', date: '2026-10-03', accountId: 'bca', kind: 'transfer', toAccountId: 'gopay', amountMinor: 500_000, note: 'Isi saldo' }),
]
const f = (o = {}) => filterTransactions(txs, { ...NO_FILTERS, ...o }, ctx).map((t) => t.id)

describe('filterTransactions', () => {
  it('returns everything with no filters', () => expect(f()).toEqual(['1', '2', '3', '4']))
  it('filters by kind', () => expect(f({ kind: 'income' })).toEqual(['3']))
  it('matches a transfer on either account', () => {
    expect(f({ accountId: 'gopay' })).toEqual(['2', '4'])
    expect(f({ accountId: 'bca' })).toEqual(['1', '3', '4'])
  })
  it('filters by category, uncategorized and project', () => {
    expect(f({ categoryId: 'makan' })).toEqual(['1'])
    expect(f({ categoryId: 'none' })).toEqual(['2'])
    expect(f({ projectId: 'prj' })).toEqual(['3'])
  })
  it('filters by tag and by an inclusive date range', () => {
    expect(f({ tag: 'kantor' })).toEqual(['1'])
    expect(f({ from: '2026-10-03', to: '2026-10-05' })).toEqual(['1', '2', '4'])
    expect(f({ from: '2026-10-05' })).toEqual(['1', '2'])
  })
  it('searches note, payee, tag, category and account names, all words', () => {
    expect(f({ query: 'warteg' })).toEqual(['1'])
    expect(f({ query: 'gojek' })).toEqual(['2'])
    expect(f({ query: 'KANTOR' })).toEqual(['1', '2'])
    expect(f({ query: 'gaji' })).toEqual(['3'])
    expect(f({ query: 'bca makan' })).toEqual(['1'])
    expect(f({ query: 'tidak ada' })).toEqual([])
  })
  it('combines filters', () => expect(f({ accountId: 'bca', kind: 'expense' })).toEqual(['1']))
})

describe('sortTransactions', () => {
  const ids = (sort: Parameters<typeof sortTransactions>[1]) => sortTransactions(txs, sort).map((t) => t.id)
  it('sorts by date, newest and oldest first, and keeps ties stable', () => {
    expect(ids('terbaru')).toEqual(['2', '1', '4', '3'])
    expect(ids('terlama')).toEqual(['3', '4', '1', '2'])
  })
  it('sorts by amount', () => {
    expect(ids('terbesar')).toEqual(['3', '4', '1', '2'])
    expect(ids('terkecil')).toEqual(['2', '1', '4', '3'])
  })
  it('ranks a foreign amount by its base amount', () => {
    const usd = makeTx({ id: 'u', currency: 'USD', accountId: 'p', amountMinor: 100, kind: 'income', fx: { rate: 16_000, baseAmountMinor: 16_000 } })
    expect(sortTransactions([makeTx({ id: 'i', amountMinor: 20_000 }), usd], 'terbesar').map((t) => t.id)).toEqual(['i', 'u'])
  })
  it('does not change its input', () => {
    const copy = [...txs]
    sortTransactions(txs, 'terkecil')
    expect(txs).toEqual(copy)
  })
})

describe('groupByDay', () => {
  it('groups in order with a subtotal that leaves transfers out', () => {
    const groups = groupByDay(sortTransactions(txs, 'terbaru'))
    expect(groups.map((g) => [g.date, g.items.length])).toEqual([['2026-10-05', 2], ['2026-10-03', 1], ['2026-10-01', 1]])
    expect(groups[0]).toMatchObject({ incomeMinor: 0, expenseMinor: 46_000, netMinor: -46_000 })
    expect(groups[1]).toMatchObject({ incomeMinor: 0, expenseMinor: 0, netMinor: 0 })
    expect(groups[2]).toMatchObject({ incomeMinor: 8_000_000, netMinor: 8_000_000 })
  })
  it('is empty for an empty list', () => expect(groupByDay([])).toEqual([]))
})

describe('helpers', () => {
  it('counts active filters and lists tags', () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0)
    expect(activeFilterCount({ ...NO_FILTERS, query: ' ', kind: 'income', from: '2026-10-01', to: '2026-10-31' })).toBe(2)
    expect(allTags(txs)).toEqual(['kantor'])
  })
})
