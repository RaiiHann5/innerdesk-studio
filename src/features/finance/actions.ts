import { transactionRepo } from '@/data/repos'
import { toastWithRetry } from '@/stores/retryToast'
import { useUiStore } from '@/stores/ui'
import type { Transaction } from '@/types/domain'
import { useTransactionStore } from './store/financeStores'

/** Brings a deleted transaction back with its id, timestamps and stored base amount, then refreshes the list. */
async function restoreTransaction(tx: Transaction): Promise<void> {
  await transactionRepo.restore(tx)
  await useTransactionStore.getState().load()
}

/** Deletes a transaction and offers one undo. A failed delete says so and offers to try again. */
export async function deleteTransactionWithUndo(tx: Transaction): Promise<void> {
  try {
    await useTransactionStore.getState().remove(tx.id)
  } catch {
    toastWithRetry('Transaksi gagal dihapus.', () => deleteTransactionWithUndo(tx))
    return
  }
  useUiStore.getState().showToast('Transaksi dihapus.', {
    label: 'Urungkan',
    run: () => void restoreTransaction(tx).catch(() => toastWithRetry('Transaksi gagal dikembalikan.', () => restoreTransaction(tx))),
  })
}
