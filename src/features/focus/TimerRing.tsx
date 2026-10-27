import { useMemo, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface TimerRingProps {
  /** 0 to 1. */
  progress: number
  size?: number
  /** Rounded up when a block is running, flat when it is idle. */
  running?: boolean
  className?: string
  /** Stands in the middle of the ring. */
  children?: ReactNode
}

const STROKE = 8
const TRACK = 2
/** The circle the character sits in, so the ring frames it rather than the other way round. */
const RADIUS = 88
const VIEW = 200

/** The size of that inner circle, so the character is drawn to the frame the ring already sets. */
export const RING_INNER_RATIO = (RADIUS - STROKE / 2) / (VIEW / 2)

/**
 * The progress ring: an orange arc on a hairline track.
 *
 * The arc is drawn with `stroke-dasharray` and rotated so it starts at twelve o'clock. There is no
 * glow and no shadow here, which keeps the orange doing one job: showing how much is left.
 */
export function TimerRing({ progress, size = 288, running, className, children }: TimerRingProps) {
  const circumference = useMemo(() => 2 * Math.PI * RADIUS, [])
  const filled = Math.min(1, Math.max(0, progress)) * circumference

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} aria-hidden className="size-full -rotate-90">
        <circle cx={VIEW / 2} cy={VIEW / 2} r={RADIUS} fill="none" className="stroke-line" strokeWidth={TRACK} />
        <circle
          cx={VIEW / 2}
          cy={VIEW / 2}
          r={RADIUS}
          fill="none"
          className="stroke-accent transition-[stroke-dasharray,stroke-opacity] duration-base ease-linear"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeOpacity={running === false ? 0.55 : 1}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}