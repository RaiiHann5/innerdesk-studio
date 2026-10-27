import { useMemo, useState } from 'react'
import { Target } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { fmt } from '@/lib/date'
import { goalPace } from '@/lib/financeGoals'
import { goalProgress } from '@/lib/financeSelectors'
import type { Goal } from '@/types/domain'
import { ContributionPanel, GoalEditor } from './GoalPanels'
import { archiveGoal } from './planningActions'
import { useGoalStore } from './store/financeStores'
import { Amount } from './ui/Amount'
import { UsageBar } from './ui/UsageBar'

type Panel = { kind: 'edit'; goal?: Goal } | { kind: 'contribute'; goal: Goal } | null

function PaceLine({ goal, today }: { goal: Goal; today: string }) {
  const pace = goalPace(goal, today)
  if (pace.state === 'reached') return <p className="text-xs text-muted">Target tercapai.</p>
  if (pace.state === 'no-date') return <p className="text-xs text-muted">Tanpa tanggal target. Tambahkan setoran kapan pun kamu sempat.</p>
  if (pace.state === 'past') return <p className="text-xs text-muted">Tanggal target sudah lewat. Kamu bisa menggesernya lewat Ubah.</p>
  return (
    <p className="text-xs text-muted">
      Sekitar <Amount minor={pace.perMonthMinor} /> per bulan selama {pace.monthsLeft} bulan.
    </p>
  )
}

export function GoalsTab({ today }: { today: string }) {
  const goals = useGoalStore((s) => s.items)
  const [panel, setPanel] = useState<Panel>(null)
  const [showArchived, setShowArchived] = useState(false)
  const live = useMemo(() => goals.filter((g) => !g.archivedAt), [goals])
  const archived = goals.filter((g) => g.archivedAt)
  const list = showArchived ? archived : live
  const close = () => setPanel(null)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-xl text-xs text-muted">Setoran target adalah pembagian dari tabungan yang sudah ada. Saldo akun tidak berubah.</p>
        <div className="flex gap-2">
          {archived.length > 0 && (
            <Button variant="ghost" aria-pressed={showArchived} onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? 'Lihat yang aktif' : `Diarsipkan (${archived.length})`}
            </Button>
          )}
          <Button onClick={() => setPanel({ kind: 'edit' })}>Target baru</Button>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Target}
          title={showArchived ? 'Belum ada target yang diarsipkan' : 'Belum ada target'}
          description="Tentukan jumlah yang ingin dikumpulkan, dan tanggalnya kalau ada. Tidak ada tenggat yang wajib."
          action={showArchived ? undefined : <Button variant="primary" onClick={() => setPanel({ kind: 'edit' })}>Target baru</Button>}
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {list.map((goal) => {
            const p = goalProgress(goal)
            return (
              <li key={goal.id} className="space-y-3 rounded-card border bg-surface p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="min-w-0 truncate text-base font-bold">{goal.name}</h3>
                  {goal.targetDate && <span className="shrink-0 text-xs text-muted">{fmt(goal.targetDate, 'd MMM yyyy')}</span>}
                </div>
                <UsageBar pct={p.pct} label={`Kemajuan target ${goal.name}`} />
                <p className="text-sm">
                  <Amount minor={p.contributedMinor} className="font-medium" /> <span className="text-muted">dari</span> <Amount minor={p.targetMinor} />
                  <span className="tabular-nums text-muted"> ({String(Math.round(p.pct)).replace('.', ',')}%)</span>
                </p>
                <PaceLine goal={goal} today={today} />
                <div className="flex flex-wrap gap-2 border-t pt-3">
                  {!goal.archivedAt && <Button onClick={() => setPanel({ kind: 'contribute', goal })}>Tambah setoran</Button>}
                  <Button variant="ghost" onClick={() => setPanel({ kind: 'edit', goal })}>
                    Ubah
                  </Button>
                  {goal.archivedAt ? (
                    <Button variant="ghost" onClick={() => void useGoalStore.getState().update(goal.id, { archivedAt: undefined })}>
                      Aktifkan lagi
                    </Button>
                  ) : (
                    <Button variant="ghost" onClick={() => void archiveGoal(goal)}>
                      Arsipkan
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {panel?.kind === 'edit' && <GoalEditor key={panel.goal?.id ?? 'new'} goal={panel.goal} today={today} onClose={close} />}
      {panel?.kind === 'contribute' && <ContributionPanel key={panel.goal.id} goalId={panel.goal.id} today={today} onClose={close} />}
    </div>
  )
}
