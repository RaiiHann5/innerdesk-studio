import type { Account, Budget, FinanceCategory, Goal, Recurring, Transaction } from '@/types/domain'

/** Builders for tests: every field has a plain default, so a test names only what it is about. */
const STAMP = '2026-10-01T00:00:00.000Z'

export const makeAccount = (over: Partial<Account> = {}): Account => ({
  id: 'bca',
  name: 'BCA',
  kind: 'bank',
  currency: 'IDR',
  openingBalanceMinor: 0,
  order: 0,
  createdAt: STAMP,
  updatedAt: STAMP,
  ...over,
})

export const makeFinanceCategory = (over: Partial<FinanceCategory> = {}): FinanceCategory => ({
  id: 'makan',
  name: 'Makan',
  kind: 'expense',
  order: 0,
  createdAt: STAMP,
  updatedAt: STAMP,
  ...over,
})

export const makeTx = (over: Partial<Transaction> = {}): Transaction => ({
  id: 'tx-1',
  date: '2026-10-05',
  kind: 'expense',
  amountMinor: 10_000,
  currency: 'IDR',
  accountId: 'bca',
  tags: [],
  createdAt: STAMP,
  updatedAt: STAMP,
  ...over,
})

export const makeBudget = (over: Partial<Budget> = {}): Budget => ({
  id: 'bud-1',
  month: '2026-10',
  categoryId: 'makan',
  limitMinor: 1_000_000,
  createdAt: STAMP,
  updatedAt: STAMP,
  ...over,
})

export const makeGoal = (over: Partial<Goal> = {}): Goal => ({
  id: 'goal-1',
  name: 'Dana darurat',
  targetMinor: 1_000_000,
  targetDate: '2027-06-30',
  contributions: [],
  createdAt: STAMP,
  updatedAt: STAMP,
  ...over,
})

export const makeRecurring = (over: Partial<Recurring> = {}): Recurring => ({
  id: 'rec-1',
  name: 'Langganan',
  kind: 'expense',
  amountMinor: 50_000,
  currency: 'IDR',
  accountId: 'bca',
  freq: 'monthly',
  interval: 1,
  nextDate: '2026-10-20',
  active: true,
  createdAt: STAMP,
  updatedAt: STAMP,
  ...over,
})
