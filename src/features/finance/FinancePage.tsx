import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { StoreGate } from '@/components/ui/StoreGate'
import { Tabs, panelId, tabId } from '@/components/ui/Tabs'
import { isoDay } from '@/lib/date'
import { isMonth, monthOf } from '@/lib/financeDates'
import { useKeyHotkey } from '@/lib/hotkeys'
import { BudgetsTab } from './BudgetsTab'
import { GoalsTab } from './GoalsTab'
import { OverviewTab } from './OverviewTab'
import { RecurringManager } from './RecurringManager'
import { TransactionEditor, type EditorTarget } from './TransactionEditor'
import { TransactionsTab } from './TransactionsTab'
import { FINANCE_STORES, loadFinance } from './store/financeStores'
import { usePrivacyStore } from './store/privacy'
import { FinanceSkeleton } from './ui/FinanceSkeleton'
import { MonthSwitcher } from './ui/MonthSwitcher'

type FinanceTab = 'ringkasan' | 'transaksi' | 'anggaran' | 'target'
const TABS: Array<{ value: FinanceTab; label: string }> = [
  { value: 'ringkasan', label: 'Ringkasan' },
  { value: 'transaksi', label: 'Transaksi' },
  { value: 'anggaran', label: 'Anggaran' },
  { value: 'target', label: 'Target' },
]

export default function FinancePage() {
  const [params, setParams] = useSearchParams()
  const hidden = usePrivacyStore((s) => s.hidden)
  const togglePrivacy = usePrivacyStore((s) => s.toggle)
  const [editor, setEditor] = useState<EditorTarget | null>(null)
  const closeEditor = useCallback(() => setEditor(null), [])
  const [bills, setBills] = useState(false)

  const today = isoDay(0)
  const currentMonth = monthOf(today)
  const requestedTab = params.get('tab')
  const tab: FinanceTab = TABS.some((t) => t.value === requestedTab) ? (requestedTab as FinanceTab) : 'ringkasan'
  const requested = params.get('bulan')
  const month = isMonth(requested) ? requested : currentMonth

  useEffect(() => {
    void loadFinance()
  }, [])
  useKeyHotkey({ key: 'H', shift: true }, togglePrivacy)

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace: true })
  }

  return (
    <Page>
      <PageHeader
        title="Keuangan"
        description="Catatan uang yang kamu isi sendiri. Semua dihitung di perangkat ini."
        actions={
          <div className="flex items-center gap-2">
            <Button
              aria-pressed={hidden}
              onClick={togglePrivacy}
              title="Menyamarkan nominal di layar saja (Shift+H). Bukan enkripsi: data tetap tersimpan seperti biasa."
            >
              {hidden ? <EyeSlash aria-hidden /> : <Eye aria-hidden />}
              Sembunyikan nominal
            </Button>
            <Button variant="primary" onClick={() => setEditor({ mode: 'new' })}>
              Catat transaksi
            </Button>
          </div>
        }
      />
      {hidden && (
        <p role="status" className="-mt-3 text-xs text-muted">
          Nominal disamarkan di layar. Ini bukan enkripsi: datanya tersimpan seperti biasa.
        </p>
      )}
      <Tabs
        items={TABS}
        value={tab}
        onChange={(value) => update({ tab: value === 'ringkasan' ? null : value })}
        label="Bagian keuangan"
        idPrefix="finance"
        tone="neutral"
        actions={<MonthSwitcher month={month} currentMonth={currentMonth} onChange={(next) => update({ bulan: next === currentMonth ? null : next })} />}
      />
      <div role="tabpanel" id={panelId('finance', tab)} aria-labelledby={tabId('finance', tab)}>
        <StoreGate stores={FINANCE_STORES} skeleton={<FinanceSkeleton variant={tab === 'ringkasan' ? 'overview' : 'list'} />}>
          {tab === 'ringkasan' && <OverviewTab month={month} today={today} />}
          {tab === 'transaksi' && <TransactionsTab month={month} today={today} onEditor={setEditor} />}
          {tab === 'anggaran' && <BudgetsTab month={month} today={today} onManageBills={() => setBills(true)} />}
          {tab === 'target' && <GoalsTab today={today} />}
        </StoreGate>
      </div>
      {bills && <RecurringManager today={today} onClose={() => setBills(false)} />}
      {editor && <TransactionEditor key={editor.mode === 'edit' ? editor.tx.id : 'new'} target={editor} today={today} onClose={closeEditor} />}
    </Page>
  )
}
