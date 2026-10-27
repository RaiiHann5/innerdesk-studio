import { useMemo, useState } from 'react'
import { Receipt } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { upcomingRecurring } from '@/lib/financeSelectors'
import { dayWord } from '../labels'
import { recordRecurring } from '../planningActions'
import { useRecurringStore } from '../store/financeStores'
import { Amount } from './Amount'

const FREQ_LABEL = { weekly: 'mingguan', monthly: 'bulanan', yearly: 'tahunan' } as const

/** Bills due soon, soonest first. "Catat" records one by hand and moves its date on; nothing is ever posted by itself. */
export function UpcomingBills({ today, onManage }: { today: string; onManage: () => void }) {
  const items = useRecurringStore((s) => s.items)
  const rows = useMemo(() => upcomingRecurring(items, today), [items, today])
  const [busy, setBusy] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const record = async (id: string) => {
    const r = items.find((i) => i.id === id)
    if (!r || busy) return
    setBusy(id)
    const error = await recordRecurring(r, today)
    setErrors((e) => ({ ...e, [id]: error ?? '' }))
    setBusy(null)
  }

  return (
    <section aria-label="Tagihan berikutnya" className="rounded-card border bg-surface">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h3 className="text-sm font-bold">Tagihan berikutnya</h3>
        <Button variant="ghost" onClick={onManage}>
          Kelola tagihan
        </Button>
      </header>
      {rows.length === 0 ? (
        <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted">
          <Receipt aria-hidden /> Tidak ada tagihan dalam 30 hari ke depan.
        </p>
      ) : (
        <ul className="divide-y">
          {rows.map(({ recurring: r, daysUntil, overdue }) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-medium">{r.name}</span>
                <span className={cn('block text-xs', overdue ? 'text-status-overdue' : 'text-muted')}>
                  {overdue ? `Terlambat ${-daysUntil} hari` : dayWord(r.nextDate, today)} · {FREQ_LABEL[r.freq]}
                </span>
                {errors[r.id] && (
                  <span role="alert" className="block text-xs text-status-overdue">
                    {errors[r.id]}
                  </span>
                )}
              </span>
              <Amount minor={r.amountMinor} currency={r.currency} signed={r.kind === 'income'} className="text-base font-medium" />
              <Button disabled={busy !== null} aria-label={`Catat ${r.name}`} onClick={() => void record(r.id)}>
                Catat
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
