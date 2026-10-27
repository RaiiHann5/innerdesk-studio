import { useEffect, useRef, useState } from 'react'
import { Page } from '@/components/layout/Page'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { StoreGate } from '@/components/ui/StoreGate'
import { fmt, isoDay } from '@/lib/date'
import { useMoodStore } from '@/stores/entities'
import type { MoodEntry } from '@/types/domain'
import { InsightList } from './InsightList'
import { MoodCheckIn } from './MoodCheckIn'
import { MoodHeatmap } from './MoodHeatmap'
import { MoodRecentList } from './MoodRecentList'
import { MoodTrendChart } from './MoodTrendChart'
import { useMoodActions } from './hooks/useMoodActions'
import { useSelectedDate } from './hooks/useSelectedDate'

const STORES = [useMoodStore]

function MoodSkeleton() {
  return (
    <div role="status" aria-label="Memuat" className="space-y-6">
      <Skeleton className="h-72 rounded-card" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-20 rounded-card" />
        <Skeleton className="h-20 rounded-card" />
      </div>
    </div>
  )
}

function Mood() {
  const entries = useMoodStore((s) => s.items)
  const { remove } = useMoodActions()
  const [date, setDate] = useSelectedDate()
  const [pendingDelete, setPendingDelete] = useState<MoodEntry | null>(null)
  const checkInRef = useRef<HTMLDivElement>(null)

  const entry = entries.find((e) => e.date === date)

  // Focus moves once the check-in has rendered the requested day, not before.
  const [focusRequest, setFocusRequest] = useState(0)
  useEffect(() => {
    if (focusRequest === 0) return
    checkInRef.current?.scrollIntoView({ block: 'start' })
    checkInRef.current?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus()
  }, [focusRequest, date])

  const openDay = (day: string) => {
    setDate(day)
    setFocusRequest((n) => n + 1)
  }
  const edit = (target: MoodEntry) => openDay(target.date)
  const startToday = () => {
    setDate(isoDay(0))
    setFocusRequest((n) => n + 1)
  }

  return (
    <div className="space-y-6">
      <div ref={checkInRef}>
        <MoodCheckIn key={date} date={date} entry={entry} onBackToToday={startToday} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Kalender suasana hati" className="rounded-card border bg-surface p-4 md:p-5">
          <MoodHeatmap entries={entries} selectedDate={date} onSelect={openDay} />
        </section>
        <section aria-labelledby="trend-title" className="rounded-card border bg-surface p-4 md:p-5">
          <h2 id="trend-title" className="mb-3 font-display text-md font-bold tracking-tight">
            30 hari terakhir
          </h2>
          <MoodTrendChart entries={entries} />
        </section>
      </div>
      <section aria-labelledby="insight-title" className="rounded-card border bg-surface p-4 md:p-5">
        <h2 id="insight-title" className="mb-3 font-display text-md font-bold tracking-tight">
          Pola
        </h2>
        <InsightList entries={entries} />
      </section>
      <MoodRecentList entries={entries} onEdit={edit} onDelete={setPendingDelete} onStart={startToday} />
      <ConfirmDialog
        open={pendingDelete !== null}
        label="Hapus catatan suasana hati"
        title={pendingDelete ? `Hapus catatan ${fmt(pendingDelete.date, 'd MMMM')}?` : ''}
        description="Catatan suasana hati hari itu akan dihapus. Kamu masih bisa mengurungkannya sesaat setelahnya."
        confirmLabel="Hapus"
        destructive
        onConfirm={() => pendingDelete && void remove(pendingDelete)}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}

export default function MoodPage() {
  return (
    <Page>
      <PageHeader title="Mood" description="Catat suasana hatimu sebentar setiap hari, lihat polanya dari waktu ke waktu." />
      <StoreGate stores={STORES} skeleton={<MoodSkeleton />}>
        <Mood />
      </StoreGate>
    </Page>
  )
}
