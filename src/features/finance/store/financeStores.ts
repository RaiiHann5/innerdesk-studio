import { accountRepo, budgetRepo, financeCategoryRepo, goalRepo, recurringRepo, transactionRepo } from '@/data/repos'
import { createEntityStore } from '@/stores/createEntityStore'
import type { Account, Budget, FinanceCategory, Goal, Recurring, Transaction } from '@/types/domain'

export const useAccountStore = createEntityStore<Account>(accountRepo)
export const useFinanceCategoryStore = createEntityStore<FinanceCategory>(financeCategoryRepo)
export const useTransactionStore = createEntityStore<Transaction>(transactionRepo)
export const useBudgetStore = createEntityStore<Budget>(budgetRepo)
export const useGoalStore = createEntityStore<Goal>(goalRepo)
export const useRecurringStore = createEntityStore<Recurring>(recurringRepo)

/** What the finance page needs before it can draw. A stable array, as StoreGate requires. */
export const FINANCE_STORES = [useAccountStore, useFinanceCategoryStore, useTransactionStore, useBudgetStore, useGoalStore, useRecurringStore]

/** Loads any finance store that has not loaded yet. Nothing here runs at app start: only the finance page calls it. */
export const loadFinance = () => Promise.all(FINANCE_STORES.filter((s) => s.getState().status === 'idle').map((s) => s.getState().load()))
