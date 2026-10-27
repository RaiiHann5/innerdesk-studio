import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Fire, Plus, Repeat } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, panelId, tabId, type TabItem } from '@/components/ui/Tabs'
import { fmt } from '@/lib/date'
import { streakOf, summarizeDay } from '@/lib/habits'
import { ArchivedHabits } from './ArchivedHabits'
import { HabitRow } from './HabitRow'
import { HabitStats } from './HabitStats'
import { HABIT_PRESETS, type HabitPreset } from './habitUi'
import { useHabitData } from './useHabitData'

type Tab = 'hari-ini' | 'statistik' | 'arsip'
const PREFIX = 'habit'
const isTab = (value: string | null): value is Tab => value === 'hari-ini' || value === 'statistik' || value === 'arsip'

export function HabitsViewSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-24 w-full rounded-card" />
      <Skeleton className="h-32 w-full rounded-card" />
      <Skeleton className="h-32 w-full rounded-card" />
    </div>
  )
}

interface HabitsViewProps {
  onCreate: (preset?: HabitPreset) => void
}

export function HabitsView({ onCreate }: HabitsViewProps) {
  const { active, archived, index, moods, today } = useHabitData()
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: Tab = isTab(raw) ? raw : 'hari-ini'

  const summary = useMemo(() => summarizeDay(active, index, today), [active, index, today])
  const longest = useMemo(() => active.reduce((max, habit) => Math.max(max, streakOf(habit, index, today).current), 0), [active, index, today])

  const tabs: TabItem<Tab>[] = [
    { value: 'hari-ini', label: 'Hari ini', count: active.length },
    { value: 'statistik', label: 'Statistik' },
    { value: 'arsip', label: 'Arsip', count: archived.length },
  ]

  if (active.length === 0 && archived.length === 0) {
    return (
      <EmptyState
        icon={Repeat}
        title="Belum ada kebiasaan"
        description="Mulai dari satu yang kecil. Mulai dari contoh di bawah, atau buat sendiri."
        action={
          <div className="flex max-w-md flex-wrap justify-center gap-2">
            {HABIT_PRESETS.map((preset) => (
              <Button key={preset.name} onClick={() => onCreate(preset)}>
                <Plus aria-hidden />
                {preset.name}
              </Button>
            ))}
            <Button variant="primary" onClick={() => onCreate()}>
              Buat sendiri
            </Button>
          </div>
        }
      />
    )
  }

  const percent = summary.total === 0 ? 0 : Math.round((summary.done / summary.total) * 100)

  return (
    <div className="space-y-4">
      <Tabs
        items={tabs}
        value={tab}
        onChange={(next) => setParams(next === 'hari-ini' ? {} : { tab: next }, { replace: true })}
        label="Tampilan kebiasaan"
        idPrefix={PREFIX}
      />
      <div role="tabpanel" id={panelId(PREFIX, tab)} aria-labelledby={tabId(PREFIX, tab)} tabIndex={0} className="space-y-4 outline-offset-4">
        {tab === 'hari-ini' && (
          <>
            <section aria-label="Ringkasan hari ini" className="rounded-card border bg-surface p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-muted">{fmt(today, 'EEEE, d MMMM')}</p>
                  <p className="mt-1 font-display text-xl font-bold tabular-nums">
                    {summary.done} <span className="font-ui text-sm font-normal text-muted">dari {summary.total} kebiasaan selesai</span>
                  </p>
                </div>
                {longest > 0 && (
                  <p className="flex items-center gap-1.5 text-sm font-medium tabular-nums text-status-doing">
                    <Fire size={16} weight="fill" aria-hidden />
                    Streak terpanjang {longest} hari
                  </p>
                )}
              </div>
              <ProgressBar value={percent} label="Kebiasaan selesai hari ini" className="mt-3" />
              {summary.total === 0 ? (
                <p className="mt-3 text-sm text-muted">Tidak ada kebiasaan yang dijadwalkan hari ini.</p>
              ) : (
                summary.done === summary.total && <p className="mt-3 text-sm font-medium">Semua kebiasaan hari ini selesai.</p>
              )}
            </section>

            {active.length === 0 ? (
              <EmptyState icon={Repeat} title="Tidak ada kebiasaan aktif" description="Semua kebiasaanmu ada di Arsip. Pulihkan satu, atau buat yang baru." action={<Button variant="primary" onClick={() => onCreate()}>Kebiasaan baru</Button>} />
            ) : (
              <ul className="space-y-3">
                {active.map((habit) => (
                  <HabitRow key={habit.id} habit={habit} index={index} today={today} />
                ))}
              </ul>
            )}
          </>
        )}
        {tab === 'statistik' && (active.length === 0 ? <EmptyState icon={Repeat} title="Belum ada yang dihitung" description="Statistik muncul setelah ada kebiasaan aktif." /> : <HabitStats habits={active} index={index} moods={moods} today={today} />)}
        {tab === 'arsip' && <ArchivedHabits habits={archived} />}
      </div>
    </div>
  )
}
