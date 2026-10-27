import { useMemo, useState, type FormEvent } from 'react'
import { Lightning } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { controlClass } from '@/components/ui/Field'
import { BASE_CURRENCY } from '@/lib/config'
import { parseFinanceCapture } from '@/lib/financeCapture'
import { validateTransaction } from '@/lib/financeValidate'
import { formatMoney } from '@/lib/money'
import { useUiStore } from '@/stores/ui'
import { KIND_LABEL, dayWord } from '../labels'
import { buildCaptureDraft } from '../lib/captureDraft'
import { defaultAccountId } from '../lib/defaults'
import { useAccountStore, useFinanceCategoryStore, useTransactionStore } from '../store/financeStores'
import type { EditorTarget } from '../TransactionEditor'

interface QuickAddBarProps {
  today: string
  onOpenEditor: (target: EditorTarget) => void
}

/** "makan siang 35rb kemarin" and Enter. The chip shows what will be saved before it is. */
export function QuickAddBar({ today, onOpenEditor }: QuickAddBarProps) {
  const accounts = useAccountStore((s) => s.items)
  const categories = useFinanceCategoryStore((s) => s.items)
  const txs = useTransactionStore((s) => s.items)
  const add = useTransactionStore((s) => s.add)
  const showToast = useUiStore((s) => s.showToast)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const parsed = useMemo(
    () => parseFinanceCapture(text, { accounts, categories, now: new Date(`${today}T12:00:00`) }),
    [text, accounts, categories, today],
  )
  const accountId = parsed.accountId ?? defaultAccountId(txs, accounts, parsed.currency)
  const account = accounts.find((a) => a.id === accountId)
  const categoryName = categories.find((c) => c.id === parsed.categoryId)?.name

  const chip = [
    KIND_LABEL[parsed.kind],
    categoryName,
    parsed.amountMinor !== null ? formatMoney(parsed.amountMinor, parsed.currency, { bare: parsed.currency === BASE_CURRENCY }) : null,
    dayWord(parsed.date, today),
    parsed.accountId ? account?.name : null,
  ]
    .filter(Boolean)
    .join(', ')

  const draft = () => buildCaptureDraft(parsed, accounts, txs)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    const result = draft()
    if ('error' in result) return setError(result.error)
    if ('open' in result) {
      onOpenEditor({ mode: 'new', defaults: result.open })
      setText('')
      return
    }
    const issues = validateTransaction(result, accounts, categories)
    if (issues.length) return setError(issues[0].message)
    setError(null)
    add(result)
      .then(() => {
        setText('')
        showToast(`${KIND_LABEL[result.kind]} ${formatMoney(result.amountMinor, result.currency)} dicatat.`)
      })
      .catch(() => setError('Gagal menyimpan. Coba tekan Enter lagi.'))
  }

  return (
    <form onSubmit={submit} className="space-y-1.5" aria-label="Formulir catat cepat">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Lightning aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setError(null)
            }}
            aria-label="Catat cepat"
            aria-describedby="quick-add-hint"
            placeholder="Catat cepat: makan siang 35rb kemarin"
            autoComplete="off"
            className={`${controlClass} pl-8`}
          />
        </div>
        <Button type="submit" disabled={!text.trim()}>
          Simpan
        </Button>
      </div>
      <div id="quick-add-hint" role="status" aria-live="polite" className="min-h-5 text-xs">
        {error ? (
          <span className="text-status-overdue">{error}</span>
        ) : text.trim() ? (
          <span className="inline-flex max-w-full items-center rounded-chip bg-accent-soft px-2 py-0.5 font-medium text-accent-text">
            <span className="truncate">{chip}</span>
          </span>
        ) : (
          <span className="text-muted">Nominal, tanggal (kemarin, senin), akun, dan kategori dikenali dari kalimatnya. Enter untuk menyimpan.</span>
        )}
      </div>
    </form>
  )
}
