import { useCallback, useEffect, useMemo } from 'react'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Skeleton } from '@/components/ui/Skeleton'
import { StoreGate } from '@/components/ui/StoreGate'
import { loadFocusRange, useFocusStore as useSessionStore } from '@/stores/entities'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { useUiStore } from '@/stores/ui'
import type { FocusMode } from '@/types/domain'
import { CycleDots } from './CycleDots'
import { Companion } from './character/Companion'
import { POSE_STATUS, poseFor } from './character/poses'
import { Controls } from './Controls'
import { FocusSettingsPopover } from './FocusSettingsPopover'
import { SessionList } from './SessionList'
import { TaskPicker, useTaskPicker } from './TaskPicker'
import { TimerDigits } from './TimerDigits'
import { WeeklyChart } from './WeeklyChart'
import { RING_INNER_RATIO, TimerRing } from './TimerRing'
import { cycleProgress } from './lib/cycle'
import { focusSecondsByDay, focusTotals, sessionsOn } from './lib/focusSelectors'
import { MODE_LABEL, formatDuration, plannedSeconds, progress as ringProgress } from './lib/time'
import { useFocusHotkeys } from './hooks/useFocusHotkeys'
import { useTimerEngine } from './hooks/useTimerEngine'
import { useFocusStore } from './store/focusStore'

const MODE_OPTIONS: Array<{ value: FocusMode; label: string }> = [
  { value: 'focus', label: 'Fokus' },
  { value: 'short', label: 'Istirahat pendek' },
  { value: 'long', label: 'Istirahat panjang' },
]

// On a phone the three modes must share one row, so the break labels are shortened there.
const MODE_OPTIONS_COMPACT: Array<{ value: FocusMode; label: string }> = [
  { value: 'focus', label: 'Fokus' },
  { value: 'short', label: 'Pendek' },
  { value: 'long', label: 'Panjang' },
]

const STORES = [useSessionStore]

function Focus() {
  const { snapshot, celebrating, startPause, reset, skip, selectMode } = useTimerEngine()
  const settings = useFocusStore((s) => s.settings)
  const updateSettings = useFocusStore((s) => s.updateSettings)
  const cycle = useFocusStore((s) => s.cycle)
  const sessions = useSessionStore((s) => s.items)
  const zenMode = useUiStore((s) => s.zenMode)
  const setZenMode = useUiStore((s) => s.setZenMode)

  const dayRange = useMemo(() => todayRange(), [])

  useEffect(() => {
    void loadFocusRange(dayRange)
  }, [dayRange])

  const enterZen = useCallback(() => setZenMode(true), [setZenMode])
  const exitZen = useCallback(() => setZenMode(false), [setZenMode])
  useFocusHotkeys({ toggle: startPause, reset, skip, enterZen, exitZen })

  const dots = cycleProgress(cycle, settings.longEvery)
  const today = useMemo(() => focusTotals(sessionsOn(sessions, new Date())), [sessions])
  const planned = plannedSeconds(settings, snapshot.mode)
  const pose = poseFor({ ...snapshot, celebrating })
  const { picker } = useTaskPicker(snapshot.running)
  const focusByDay = useMemo(() => focusSecondsByDay(sessions), [sessions])

  // The ring is drawn at a fixed size per breakpoint so the character inside can be sized to match.
  const compact = useMediaQuery('(max-width: 639px)')
  const wide = useMediaQuery('(min-width: 1024px)')
  const ringSize = compact ? 224 : wide ? 320 : 280
  const companionSize = compact ? 140 : wide ? 196 : 172

  const timer = (
    <div className="flex flex-col items-center gap-6">
      {/* The mode changes and is worth one sentence. The seconds going by are not. */}
      <p aria-live="polite" className="sr-only">
        {`Mode ${MODE_LABEL[snapshot.mode]}.`}
      </p>

      <TimerRing progress={ringProgress(snapshot.remaining, planned)} running={snapshot.running} size={ringSize}>
        <div className="grid place-items-center rounded-full" style={{ width: `${RING_INNER_RATIO * 100}%`, aspectRatio: '1' }}>
          {settings.characterOn && <Companion pose={pose} status={POSE_STATUS[pose]} size={companionSize} reduceMotion={settings.reduceMotion} />}
        </div>
      </TimerRing>

      <div className="space-y-1 text-center">
        <TimerDigits remaining={snapshot.remaining} label={`Sisa waktu ${MODE_LABEL[snapshot.mode]}`} />
        <p className="text-sm text-muted">{statusLine(snapshot, planned)}</p>
      </div>

      <Controls running={snapshot.running} started={snapshot.started} onToggle={startPause} onReset={reset} onSkip={skip} />
    </div>
  )

  if (zenMode) {
    return (
      <div className="flex min-h-full p-4 md:p-8">
        <div className="m-auto w-full max-w-md space-y-6">
          {timer}
          <p className="text-center text-xs text-muted">Tekan Esc untuk keluar dari mode fokus.</p>
        </div>
      </div>
    )
  }

  return (
    // `m-auto` inside a min-h-full flex box centres the page when it is short and lets it scroll from the
    // top when it is tall. `justify-center` on an overflowing column cuts the top off.
    <div className="flex min-h-full p-4 md:p-6 lg:p-8">
      <div className="m-auto grid w-full max-w-[1120px] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
        <section aria-label="Timer Pomodoro" className="rounded-card border bg-gradient-to-b from-accent-soft/40 to-surface p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-8">
            <div className="min-w-0 flex-1 sm:flex-none">
              <SegmentedControl
                label="Mode timer"
                options={compact ? MODE_OPTIONS_COMPACT : MODE_OPTIONS}
                value={snapshot.mode}
                onChange={selectMode}
                fullWidth={compact}
              />
            </div>
            <FocusSettingsPopover settings={settings} onChange={updateSettings} />
          </div>

          {timer}

          <div className="mx-auto mt-8 w-full max-w-sm border-t pt-6">
            <TaskPicker {...picker} />
          </div>

          <p className="mt-6 hidden text-center text-xs text-muted md:block">
            Spasi mulai atau jeda, R reset, S lewati, F mode fokus, Esc keluar.
          </p>
        </section>

        <aside className="space-y-4 lg:space-y-6">
          <section aria-label="Ringkasan hari ini" className="rounded-card border bg-surface">
            <div className="grid grid-cols-2 divide-x">
              <div className="space-y-1 p-4">
                <p className="text-xs text-muted">Sesi hari ini</p>
                <p className="font-display text-xl font-bold tabular-nums">{today.count}</p>
              </div>
              <div className="space-y-1 p-4">
                <p className="text-xs text-muted">Waktu fokus</p>
                <p className="font-display text-xl font-bold">{today.seconds > 0 ? formatDuration(today.seconds) : '0 menit'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
              <span className="text-xs text-muted">Siklus saat ini</span>
              <CycleDots done={dots.done} total={dots.total} />
            </div>
          </section>

          <div className="rounded-card border bg-surface p-4">
            <SessionList sessions={sessions} listClassName="max-h-72 overflow-y-auto pr-1" />
          </div>

          <div className="rounded-card border bg-surface p-4">
            <WeeklyChart totals={focusByDay} />
          </div>
        </aside>
      </div>
    </div>
  )
}

const statusLine = (snapshot: { running: boolean; started: boolean; mode: FocusMode }, planned: number) => {
  if (snapshot.running) return snapshot.mode === 'focus' ? 'Tarik napas, kerjakan satu hal.' : 'Beristirahat sejenak.'
  if (snapshot.started) return 'Dijeda.'
  return `${MODE_LABEL[snapshot.mode]} ${Math.round(planned / 60)} menit`
}

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

export default function FocusPage() {
  const setZenMode = useUiStore((s) => s.setZenMode)
  // Leaving the page always drops focus mode, so coming back is never a surprise.
  useEffect(() => () => setZenMode(false), [setZenMode])

  return (
    <StoreGate stores={STORES} skeleton={<FocusSkeleton />}>
      <Focus />
    </StoreGate>
  )
}

function FocusSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat sesi Pomodoro" className="flex min-h-full p-4 md:p-6 lg:p-8">
      <div className="m-auto grid w-full max-w-[1120px] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
        <Skeleton className="h-[640px] rounded-card" />
        <div className="space-y-4 lg:space-y-6">
          <Skeleton className="h-28 rounded-card" />
          <Skeleton className="h-72 rounded-card" />
          <Skeleton className="h-40 rounded-card" />
        </div>
      </div>
    </div>
  )
}
