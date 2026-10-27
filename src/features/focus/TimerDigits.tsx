import { cn } from '@/lib/cn'
import { formatClock } from './lib/time'

interface TimerDigitsProps {
  remaining: number
  /** Announced once when the mode changes, never once a second. */
  label: string
  className?: string
}

/**
 * The countdown.
 *
 * It carries `role="timer"` so assistive technology knows it is a clock, and it is deliberately
 * not a live region: a timer that announced every second would talk over everything else on the
 * page. Mode changes are announced separately, in one sentence, when they happen.
 */
export function TimerDigits({ remaining, label, className }: TimerDigitsProps) {
  return (
    <div role="timer" aria-label={label} className={cn('text-center', className)}>
      <span className="font-display text-[64px] font-bold leading-none tabular-nums tracking-tight text-ink sm:text-[80px] lg:text-[96px]">
        {formatClock(remaining)}
      </span>
    </div>
  )
}