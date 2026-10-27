import { useEffect, useState } from 'react'
import { loadFocusRange } from '@/stores/entities'
import { notify } from './lib/notifications'
import { playChime } from './lib/chime'
import { MODE_LABEL, remainingNow } from './lib/time'
import { finishBlock } from './lib/timerActions'
import { useFocusTitle } from './hooks/useFocusTitle'
import { useFocusStore } from './store/focusStore'

const TICK_MS = 250
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The part of the timer that has to outlive any page: it ends blocks, plays the chime, sends the
 * notification and keeps the tab title.
 *
 * It renders nothing and sits above the router, so a block started on /focus still finishes,
 * records its session and credits its task while the person is on the dashboard. Completion is a
 * comparison of the clock to the deadline, never a timeout callback, so a tab that slept through
 * the end finishes the block on its first tick after waking.
 */
export function FocusRuntime({ baseTitle }: { baseTitle: string }) {
  const running = useFocusStore((s) => s.running)
  const started = useFocusStore((s) => s.started)
  const mode = useFocusStore((s) => s.mode)
  const endsAt = useFocusStore((s) => s.endsAt)
  const pausedRemainingMs = useFocusStore((s) => s.pausedRemainingMs)
  const plannedSeconds = useFocusStore((s) => s.plannedSeconds)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const tick = () => {
      const at = Date.now()
      const finished = finishBlock(at)
      if (finished) {
        // The list on the page was loaded before this session existed.
        void loadFocusRange({ start: new Date(at - DAY_MS).toISOString(), end: new Date(at + DAY_MS).toISOString() })
        if (finished.fresh) announce(finished.mode)
      }
      setNow(at)
    }
    // A reload may land after a deadline, so look straight away rather than after the first tick.
    tick()
    if (!running) return
    const id = window.setInterval(tick, TICK_MS)
    const onVisible = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [running])

  const remaining = remainingNow({ running, endsAt, pausedRemainingMs, plannedSeconds }, now)
  useFocusTitle(remaining, mode, started, baseTitle)
  return null
}

function announce(finished: 'focus' | 'short' | 'long') {
  const { settings } = useFocusStore.getState()
  if (settings.sound) playChime(settings.volume)
  if (!settings.notifications) return
  notify(
    MODE_LABEL[finished],
    finished === 'focus' ? 'Sesi fokus selesai. Waktunya rehat sebentar.' : 'Istirahat selesai. Siap lanjut fokus?',
  )
}
