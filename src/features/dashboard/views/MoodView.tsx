import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heartbeat } from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui/EmptyState'
import { StoreGate } from '@/components/ui/StoreGate'
import { MoodEntryCard } from '@/features/mood/MoodEntryCard'
import { MoodHeatmap } from '@/features/mood/MoodHeatmap'
import { isoDay } from '@/lib/date'
import { useMoodStore } from '@/stores/entities'
import { ViewSkeleton } from './ViewSkeleton'

const STORES = [useMoodStore]
const DAYS = 30
const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null)
const fixed = (n: number | null, digits = 1) => (n === null ? '-' : n.toLocaleString('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits }))

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-display text-xl font-bold tabular-nums">
        {value} <span className="font-ui text-sm font-normal text-muted">{unit}</span>
      </dd>
    </div>
  )
}

function Mood() {
  const entries = useMoodStore((s) => s.items)
  const navigate = useNavigate()
  const windowStart = isoDay(-(DAYS - 1))
  const recent = useMemo(() => entries.filter((e) => e.date >= windowStart), [entries, windowStart])
  const latest = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [entries])

  if (entries.length === 0) {
    return <EmptyState icon={Heartbeat} title="Belum ada catatan suasana hati" description="Catat suasana hati harianmu untuk melihat polanya di sini." action={<Link to="/journal" className="inline-flex h-8 items-center rounded-control bg-accent px-3 text-sm font-medium text-accent-on hover:bg-accent-hover">Catat hari ini</Link>} />
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
      <section aria-label="Ringkasan 30 hari" className="rounded-card border bg-surface p-4">
        <h2 className="text-md font-bold">30 hari terakhir</h2>
        <dl className="mt-3 grid grid-cols-2 gap-4">
          <Stat label="Rata-rata" value={fixed(avg(recent.map((e) => e.level)))} unit="dari 5" />
          <Stat label="Hari tercatat" value={String(recent.length)} unit={`dari ${DAYS}`} />
        </dl>
        <div className="mt-5 w-full max-w-sm">
          <MoodHeatmap entries={entries} onSelect={(date) => navigate(date === isoDay(0) ? '/journal' : `/journal?date=${date}`)} />
        </div>
        <p className="mt-3 text-xs text-muted">Pilih satu hari untuk membukanya di Jurnal.</p>
      </section>
      <section aria-label="Catatan terbaru" className="space-y-3">
        <h2 className="text-md font-bold">Catatan terbaru</h2>
        <ul className="space-y-2">
          {latest.map((e) => (
            <li key={e.id}>
              <MoodEntryCard entry={e} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export function MoodView() {
  return (
    <StoreGate stores={STORES} skeleton={<ViewSkeleton columns={2} />}>
      <Mood />
    </StoreGate>
  )
}
