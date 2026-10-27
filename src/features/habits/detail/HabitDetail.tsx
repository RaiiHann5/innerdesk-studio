import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Archive, ArrowLeft, Fire, PencilSimple, Trash } from '@phosphor-icons/react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { Tabs, panelId, tabId, type TabItem } from '@/components/ui/Tabs'
import { fmt } from '@/lib/date'
import { notesOf, totalsOf, weekdayRates, weeklyRates } from '@/lib/habitInsights'
import { describeDays, describeTarget, isCounted, moodLink, rateBetween, streakOf } from '@/lib/habits'
import { isoDay } from '@/lib/date'
import type { Habit } from '@/types/domain'
import { archiveHabitWithUndo, deleteHabitWithUndo, unarchiveHabit } from '../habitActions'
import { HabitDialog } from '../HabitDialog'
import { HabitIconTile } from '../HabitIconTile'
import { TodayControl } from '../TodayControl'
import { useHabitData } from '../useHabitData'
import { DayDialog } from './DayDialog'
import { HabitJournal } from './HabitJournal'
import { Milestones } from './Milestones'
import { MonthCalendar } from './MonthCalendar'
import { WeekdayBars } from './WeekdayBars'
import { WeeklyTrend } from './WeeklyTrend'

type Tab = 'ringkasan' | 'jurnal'
const PREFIX = 'habitd'
const isTab = (value: string | null): value is Tab => value === 'ringkasan' || value === 'jurnal'
const oneDecimal = (n: number) => n.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function Stat({ label, value, unit, hint }: { label: string; value: string; unit?: string; hint?: string }) {
  return (
    <div className="rounded-card border bg-surface p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-display text-xl font-bold tabular-nums">
        {value}
        {unit && <span className="ml-1 font-ui text-sm font-normal text-muted">{unit}</span>}
      </dd>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function HabitDetail({ habitId }: { habitId: string }) {
  const { active, archived } = useHabitData()
  const habit = useMemo(() => [...active, ...archived].find((h) => h.id === habitId), [active, archived, habitId])

  if (!habit) {
    return (
      <EmptyState
        icon={ArrowLeft}
        title="Kebiasaan tidak ditemukan"
        description="Mungkin sudah dihapus."
        action={
          <Link to="/habits" className="inline-flex h-8 items-center rounded-control bg-accent px-3 text-sm font-medium text-accent-on hover:bg-accent-hover">
            Kembali ke Kebiasaan
          </Link>
        }
      />
    )
  }
  return <Body habit={habit} />
}

function Body({ habit }: { habit: Habit }) {
  const { index, logs, moods, today } = useHabitData()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: Tab = isTab(raw) ? raw : 'ringkasan'
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // The day open in the note dialog. `fresh` lets the person choose the date, for writing about a day without finding it first.
  const [day, setDay] = useState<{ date: string; fresh: boolean } | null>(null)

  const { current, best } = streakOf(habit, index, today)
  const totals = totalsOf(habit, index, today)
  const month = rateBetween(habit, index, isoDay(-29), today, today)
  const week = rateBetween(habit, index, isoDay(-6), today, today)
  const weeks = useMemo(() => weeklyRates(habit, index, today), [habit, index, today])
  const weekdays = useMemo(() => weekdayRates(habit, index, today), [habit, index, today])
  const link = useMemo(() => moodLink(habit, index, moods, today), [habit, index, moods, today])
  const notes = notesOf(logs, habit.id)
  const noteDates = useMemo(() => new Set(notes.map((n) => n.date)), [notes])
  const archivedNow = Boolean(habit.archivedAt)

  const items: MenuItem[] = [
    { label: 'Ubah', icon: PencilSimple, onSelect: () => setEditing(true) },
    archivedNow
      ? { label: 'Pulihkan', icon: Archive, onSelect: () => void unarchiveHabit(habit) }
      : { label: 'Arsipkan', icon: Archive, onSelect: () => void archiveHabitWithUndo(habit) },
    { label: 'Hapus', icon: Trash, tone: 'danger', onSelect: () => setDeleting(true) },
  ]

  const tabs: TabItem<Tab>[] = [
    { value: 'ringkasan', label: 'Ringkasan' },
    { value: 'jurnal', label: 'Jurnal', count: notes.length },
  ]
  const pct = (r: { rate: number | null }) => (r.rate === null ? '-' : `${Math.round(r.rate * 100)}%`)

  return (
    <div className="space-y-4">
      <Link to="/habits" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft aria-hidden />
        Kebiasaan
      </Link>

      <header className="rounded-card border bg-surface p-4">
        <div className="flex items-start gap-3">
          <HabitIconTile habit={habit} className="size-12" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight">{habit.name}</h2>
            <p className="mt-0.5 text-sm text-muted">
              {describeDays(habit.days)} · {describeTarget(habit)}
              {habit.reminderTime && ` · pengingat ${habit.reminderTime.replace(':', '.')}`}
            </p>
            {habit.description && <p className="mt-1 text-sm">{habit.description}</p>}
            <p className="mt-1 text-xs text-muted">
              Dimulai {fmt(habit.startDate, 'd MMMM yyyy')} · hari ke-<span className="tabular-nums">{totals.daysSinceStart}</span>
              {archivedNow && ' · diarsipkan'}
            </p>
          </div>
          <Menu label={`Menu untuk ${habit.name}`} items={items} className="-mr-1 -mt-1" />
        </div>
        {!archivedNow && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <p className="text-sm font-medium">Hari ini</p>
            <TodayControl habit={habit} index={index} date={today} />
          </div>
        )}
      </header>

      <Tabs items={tabs} value={tab} onChange={(next) => setParams(next === 'ringkasan' ? {} : { tab: next }, { replace: true })} label="Bagian kebiasaan" idPrefix={PREFIX} />

      <div role="tabpanel" id={panelId(PREFIX, tab)} aria-labelledby={tabId(PREFIX, tab)} tabIndex={0} className="space-y-4 outline-offset-4">
        {tab === 'ringkasan' && (
          <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-card border bg-surface p-3">
                <dt className="flex items-center gap-1 text-xs text-muted">
                  {current > 0 && <Fire size={12} weight="fill" aria-hidden className="text-status-doing" />}
                  Streak sekarang
                </dt>
                <dd className="mt-1 font-display text-xl font-bold tabular-nums">
                  {current} <span className="font-ui text-sm font-normal text-muted">hari</span>
                </dd>
              </div>
              <Stat label="Terpanjang" value={String(best)} unit="hari" />
              <Stat
                label="Total selesai"
                value={String(totals.completedDays)}
                unit="hari"
                hint={isCounted(habit) ? `${totals.amount}${habit.unit ? ` ${habit.unit}` : ''} seluruhnya` : undefined}
              />
              <Stat label="30 hari" value={pct(month)} hint={`7 hari: ${pct(week)}`} />
            </dl>

            <div className="grid gap-4 lg:grid-cols-2">
              <MonthCalendar habit={habit} index={index} today={today} noteDates={noteDates} onPick={(date) => setDay({ date, fresh: false })} />
              <WeeklyTrend habit={habit} weeks={weeks} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <WeekdayBars habit={habit} rates={weekdays} />
              <Milestones habit={habit} bestStreak={best} currentStreak={current} completedDays={totals.completedDays} />
            </div>

            {link && (
              <p className="rounded-card border bg-surface p-4 text-sm text-muted">
                Di hari kamu menyelesaikannya, suasana hatimu rata-rata <strong className="font-bold tabular-nums text-ink">{oneDecimal(link.withHabit)}</strong> dari 5, dibanding{' '}
                <strong className="font-bold tabular-nums text-ink">{oneDecimal(link.withoutHabit)}</strong> di hari terjadwal yang terlewat. Ini pola dari catatanmu sendiri, belum tentu sebab-akibat.
              </p>
            )}
          </>
        )}
        {tab === 'jurnal' && (
          <HabitJournal habit={habit} logs={logs} index={index} moods={moods} today={today} onWrite={() => setDay({ date: today, fresh: true })} onOpen={(date) => setDay({ date, fresh: false })} />
        )}
      </div>

      <DayDialog
        open={day !== null}
        habit={habit}
        date={day?.date ?? today}
        pickDate={day?.fresh}
        index={index}
        logs={logs}
        moods={moods}
        today={today}
        onDateChange={(date) => setDay((d) => (d ? { ...d, date } : d))}
        onClose={() => setDay(null)}
      />
      <HabitDialog open={editing} habit={habit} onClose={() => setEditing(false)} />
      <ConfirmDialog
        open={deleting}
        label="Hapus kebiasaan"
        title={`Hapus “${habit.name}”?`}
        description="Kebiasaan, seluruh riwayat, dan semua catatannya dihapus. Kalau hanya ingin berhenti sementara, arsipkan saja."
        confirmLabel="Hapus"
        destructive
        onConfirm={() => {
          void deleteHabitWithUndo(habit).then(() => navigate('/habits', { replace: true }))
        }}
        onClose={() => setDeleting(false)}
      />
    </div>
  )
}
