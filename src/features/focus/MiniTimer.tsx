import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Pause, Play } from '@phosphor-icons/react'
import { useNow } from '@/lib/useNow'
import { useFocusStore } from './store/focusStore'
import { MODE_LABEL, formatClock, remainingNow } from './lib/time'
import { startPause } from './lib/timerActions'

const RADIUS = 9
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * The running timer, on every page.
 *
 * It reads the same store the page does rather than keeping a clock of its own, so the two cannot
 * disagree. It exists only while a block is under way or paused. The pill is a link back to /focus
 * with a separate pause/play button beside it, because a button nested inside a link is not valid
 * and would make one click do two things.
 */
export const MiniTimer = memo(function MiniTimer() {
  const running = useFocusStore((s) => s.running)
  const started = useFocusStore((s) => s.started)
  const endsAt = useFocusStore((s) => s.endsAt)
  const pausedRemainingMs = useFocusStore((s) => s.pausedRemainingMs)
  const mode = useFocusStore((s) => s.mode)
  const plannedSeconds = useFocusStore((s) => s.plannedSeconds)
  // A paused block does not move, so it only needs the clock often enough to stay mounted.
  const now = useNow(running ? 1000 : 60_000)

  if (!started) return null

  const remaining = remainingNow({ running, endsAt, pausedRemainingMs, plannedSeconds }, now.getTime())
  const fraction = plannedSeconds > 0 ? Math.max(0, Math.min(1, 1 - remaining / (plannedSeconds * 1000))) : 0
  const clock = formatClock(remaining)

  return (
    <div className="flex h-8 items-center rounded-full border bg-surface text-sm">
      <Link
        to="/focus"
        aria-label={`Buka timer Pomodoro. ${MODE_LABEL[mode]}, sisa ${clock}${running ? '' : ', dijeda'}`}
        className="flex h-full items-center gap-2 rounded-l-full pl-1.5 pr-2 transition-colors duration-fast hover:bg-sunken"
      >
        <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0 -rotate-90">
          <circle cx="12" cy="12" r={RADIUS} fill="none" className="stroke-line" strokeWidth="2" />
          <circle
            cx="12"
            cy="12"
            r={RADIUS}
            fill="none"
            className="stroke-accent"
            strokeWidth="3"
            strokeLinecap="round"
            strokeOpacity={running ? 1 : 0.55}
            strokeDasharray={`${CIRCUMFERENCE * fraction} ${CIRCUMFERENCE}`}
          />
        </svg>
        <span className="font-medium tabular-nums text-ink">{clock}</span>
        <span className="hidden text-xs text-muted sm:inline">{running ? MODE_LABEL[mode] : 'Dijeda'}</span>
      </Link>
      <button
        type="button"
        onClick={startPause}
        aria-label={running ? 'Jeda timer' : 'Lanjutkan timer'}
        className="grid size-8 shrink-0 place-items-center rounded-r-full text-muted transition-colors duration-fast hover:bg-sunken hover:text-ink"
      >
        {running ? <Pause size={14} weight="fill" aria-hidden /> : <Play size={14} weight="fill" aria-hidden />}
      </button>
    </div>
  )
})
