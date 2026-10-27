import { useEffect, useMemo, useState } from 'react'
import type { FocusMode } from '@/types/domain'
import { LAST_MINUTE_MS, remainingNow } from '../lib/time'
import { reset, selectMode, skip, startPause } from '../lib/timerActions'
import { useFocusStore } from '../store/focusStore'

/** A tick that is only for drawing. The clock itself is always `endsAt - now`. */
const FRAME_MS = 250

export interface TimerSnapshot {
  mode: FocusMode
  running: boolean
  started: boolean
  /** Milliseconds left, recomputed from `endsAt` on every frame while running. */
  remaining: number
  plannedSeconds: number
  cycle: number
  /** True in the last minute of a focus block. */
  lastMinute: boolean
}

/**
 * The timer as a page sees it: a snapshot that redraws while a block runs, plus the actions.
 *
 * It owns no clock and ends no blocks. Ending them is `FocusRuntime`'s job, which lives above the
 * router so it keeps working on every page. This hook only reads the same store and redraws.
 */
export function useTimerEngine() {
  const mode = useFocusStore((s) => s.mode)
  const running = useFocusStore((s) => s.running)
  const started = useFocusStore((s) => s.started)
  const endsAt = useFocusStore((s) => s.endsAt)
  const pausedRemainingMs = useFocusStore((s) => s.pausedRemainingMs)
  const plannedSeconds = useFocusStore((s) => s.plannedSeconds)
  const cycle = useFocusStore((s) => s.cycle)
  const celebrating = useFocusStore((s) => s.celebrating)

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    setNow(Date.now())
    if (!running) return
    const redraw = () => setNow(Date.now())
    const id = window.setInterval(redraw, FRAME_MS)
    document.addEventListener('visibilitychange', redraw)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', redraw)
    }
  }, [running])

  const snapshot = useMemo<TimerSnapshot>(() => {
    const remaining = remainingNow({ running, endsAt, pausedRemainingMs, plannedSeconds }, now)
    return {
      mode,
      running,
      started,
      remaining,
      plannedSeconds,
      cycle,
      lastMinute: mode === 'focus' && running && remaining > 0 && remaining <= LAST_MINUTE_MS,
    }
  }, [mode, running, started, endsAt, pausedRemainingMs, plannedSeconds, cycle, now])

  return { snapshot, celebrating, startPause, reset, skip, selectMode }
}
