import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LockSimple } from '@phosphor-icons/react'
import { Page } from '@/components/layout/Page'
import { HeroButton, PageHero, heroButtonClass } from '@/components/ui/PageHero'
import { Skeleton } from '@/components/ui/Skeleton'
import { StoreGate } from '@/components/ui/StoreGate'
import { isoDay } from '@/lib/date'
import { useJournalStore, useMoodStore } from '@/stores/entities'
import { DayStrip } from './DayStrip'
import { DaySummary } from './DaySummary'
import { HistoryRail } from './HistoryRail'
import { JournalEditor } from './JournalEditor'
import { PatternColumn } from './PatternColumn'
import { useJournalDate } from './hooks/useJournalDate'
import { streakDays } from './lib/progress'
import { PrivacyLock } from './privacy/PrivacyLock'
import { useLockStore } from './privacy/lockStore'

const STORES = [useJournalStore, useMoodStore]

function JournalSkeleton() {
  return (
    <div role="status" aria-label="Memuat" className="grid gap-4 lg:grid-cols-[17.5rem_minmax(0,1fr)] xl:grid-cols-[17.5rem_minmax(0,1fr)_21rem]">
      <Skeleton className="hidden h-96 rounded-card lg:block" />
      <Skeleton className="h-[40rem] rounded-card" />
      <Skeleton className="hidden h-96 rounded-card xl:block" />
    </div>
  )
}

function Journal() {
  const entries = useJournalStore((s) => s.items)
  const moodEntries = useMoodStore((s) => s.items)
  const { date, select } = useJournalDate()
  const today = isoDay(0)

  // A fresh editor is mounted when a day was deleted or restored, because the editor keeps its own text.
  const [version, setVersion] = useState(0)
  const dateRef = useRef(date)
  useEffect(() => {
    dateRef.current = date
  }, [date])
  const onReset = useCallback((resetDate: string) => {
    if (resetDate === dateRef.current) setVersion((n) => n + 1)
  }, [])

  const moods = useMemo(() => new Map(moodEntries.map((m) => [m.date, m])), [moodEntries])
  const written = useMemo(() => new Set(entries.map((e) => e.date)), [entries])
  const streak = useMemo(() => streakDays(new Set([...written, ...moods.keys()]), today), [written, moods, today])

  const entry = entries.find((e) => e.date === date)
  const open = (next: string) => select(next, { replace: true })

  return (
    <PrivacyLock>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-6 xl:grid-cols-[17.5rem_minmax(0,1fr)_21rem]">
        <div className="order-1 min-w-0 space-y-4 lg:col-start-2 lg:row-start-1">
          <DayStrip selected={date} today={today} written={written} moods={moods} onSelect={open} />
          <JournalEditor key={`${date}:${version}`} date={date} entry={entry} mood={moods.get(date)} onReset={onReset} />
        </div>

        <div className="order-3 flex flex-col gap-4 lg:sticky lg:top-6 lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:max-h-[calc(100dvh-3rem)] xl:row-span-1">
          <DaySummary mood={moods.get(date)} entry={entry} streak={streak} />
          <HistoryRail entries={entries} moods={moods} today={today} selected={date} onSelect={open} />
        </div>

        <div className="order-2 lg:col-start-2 lg:row-start-2 xl:col-start-3 xl:row-start-1">
          <PatternColumn entries={moodEntries} selected={date} onSelect={open} />
        </div>
      </div>
    </PrivacyLock>
  )
}

function LockAction() {
  const enabled = useLockStore((s) => s.enabled)
  const locked = useLockStore((s) => s.enabled && !s.unlocked)
  const lock = useLockStore((s) => s.lock)
  if (locked) return null
  return enabled ? (
    <HeroButton onClick={lock}>
      <LockSimple size={16} aria-hidden />
      Kunci sekarang
    </HeroButton>
  ) : (
    <Link to="/settings" className={heroButtonClass.secondary}>
      <LockSimple size={16} aria-hidden />
      Kunci jurnal
    </Link>
  )
}

export default function JournalPage() {
  return (
    <Page>
      <PageHero title="Jurnal & Mood" description="Mood dan catatan harianmu di satu tempat. Tersimpan dengan sendirinya." art="sunrise" band="bottom" flip actions={<LockAction />} />
      <StoreGate stores={STORES} skeleton={<JournalSkeleton />}>
        <Journal />
      </StoreGate>
    </Page>
  )
}
