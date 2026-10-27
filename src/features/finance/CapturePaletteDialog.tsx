import { useEffect, useMemo } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { parseFinanceCapture } from '@/lib/financeCapture'
import { validateTransaction } from '@/lib/financeValidate'
import { formatMoney } from '@/lib/money'
import { useUiStore } from '@/stores/ui'
import { KIND_LABEL, dayWord } from './labels'
import { buildCaptureDraft } from './lib/captureDraft'
import { loadFinance, useAccountStore, useFinanceCategoryStore, useTransactionStore } from './store/financeStores'

/** "catat pengeluaran makan siang 35rb" or "catat makan siang 35rb" -> "makan siang 35rb". Null for anything else. */
export function paletteCaptureText(query: string): string | null {
  const m = /^\s*catat(?:\s+pengeluaran)?\s+(\S.*)$/i.exec(query)
  return m ? m[1].trim() : null
}

/**
 * The confirm step for a capture typed in the command palette. Nothing is saved until the person confirms, and the
 * summary is the same sentence the quick-add chip shows.
 */
export function CapturePaletteDialog({ text, today, onClose }: { text: string; today: string; onClose: () => void }) {
  const accounts = useAccountStore((s) => s.items)
  const categories = useFinanceCategoryStore((s) => s.items)
  const txs = useTransactionStore((s) => s.items)
  const showToast = useUiStore((s) => s.showToast)
  useEffect(() => {
    void loadFinance()
  }, [])

  const parsed = useMemo(() => parseFinanceCapture(text, { accounts, categories, now: new Date(`${today}T12:00:00`) }), [text, accounts, categories, today])
  const result = useMemo(() => buildCaptureDraft(parsed, accounts, txs), [parsed, accounts, txs])
  const problem = 'error' in result ? result.error : 'open' in result ? 'Kurs belum pernah dicatat. Buka Keuangan dan catat lewat editor.' : (validateTransaction(result, accounts, categories)[0]?.message ?? null)
  const summary = [KIND_LABEL[parsed.kind], categories.find((c) => c.id === parsed.categoryId)?.name, parsed.amountMinor !== null ? formatMoney(parsed.amountMinor, parsed.currency) : null, dayWord(parsed.date, today)].filter(Boolean).join(', ')

  return (
    <ConfirmDialog
      open
      label="Catat dari palet perintah"
      title={problem ? 'Belum bisa dicatat' : 'Catat transaksi ini?'}
      description={problem ?? summary}
      confirmLabel={problem ? 'Tutup' : 'Catat'}
      onConfirm={() => {
        if (problem || 'error' in result || 'open' in result) return
        void useTransactionStore.getState().add(result).then(() => showToast('Transaksi dicatat.')).catch(() => showToast('Transaksi gagal disimpan. Coba lagi dari halaman Keuangan.'))
      }}
      onClose={onClose}
    />
  )
}
