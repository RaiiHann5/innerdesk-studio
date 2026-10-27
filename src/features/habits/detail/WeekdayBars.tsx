import { cn } from '@/lib/cn'
import { weekdayExtremes, type WeekdayRate } from '@/lib/habitInsights'
import type { Habit } from '@/types/domain'
import { HABIT_STYLE } from '../habitUi'

const DAY_NAME = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
const pct = (rate: number | null) => (rate === null ? '-' : `${Math.round(rate * 100)}%`)

/** Which weekdays the habit goes well on, over the last 90 days. Says so in a sentence only when the difference is real. */
export function WeekdayBars({ habit, rates }: { habit: Habit; rates: WeekdayRate[] }) {
  const style = HABIT_STYLE[habit.color]
  const extremes = weekdayExtremes(rates)

  return (
    <section aria-label="Hari terbaik" className="rounded-card border bg-surface p-4">
      <h3 className="font-medium">Per hari dalam seminggu</h3>
      <p className="mt-0.5 text-xs text-muted">90 hari terakhir, dari hari yang dijadwalkan.</p>
      <ul className="mt-3 space-y-2">
        {rates.map((r) => (
          <li key={r.weekday} className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-2 text-sm">
            <span className={cn(extremes?.best.weekday === r.weekday && 'font-bold')}>{DAY_NAME[r.weekday - 1]}</span>
            <span aria-hidden className="h-2.5 overflow-hidden rounded-full bg-sunken">
              <span className={cn('block h-full rounded-full', style.solid)} style={{ width: `${Math.round((r.rate ?? 0) * 100)}%` }} />
            </span>
            <span className="text-right tabular-nums text-muted">
              {pct(r.rate)}
              <span className="sr-only">, {r.done} dari {r.scheduled} hari</span>
            </span>
          </li>
        ))}
      </ul>
      {extremes && (
        <p className="mt-3 text-sm text-muted">
          Paling lancar di hari <strong className="font-bold text-ink">{DAY_NAME[extremes.best.weekday - 1]}</strong> ({pct(extremes.best.rate)}), paling sulit di hari{' '}
          <strong className="font-bold text-ink">{DAY_NAME[extremes.worst.weekday - 1]}</strong> ({pct(extremes.worst.rate)}).
        </p>
      )}
    </section>
  )
}
