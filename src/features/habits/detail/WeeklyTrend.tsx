import { cn } from '@/lib/cn'
import { fmt } from '@/lib/date'
import type { WeekRate } from '@/lib/habitInsights'
import type { Habit } from '@/types/domain'
import { HABIT_STYLE } from '../habitUi'

const pct = (rate: number | null) => (rate === null ? 'tidak ada hari terjadwal' : `${Math.round(rate * 100)}%`)

/** Twelve weeks as bars: how much of what was due got done each week. Weeks with nothing due are left empty, not drawn as zero. */
export function WeeklyTrend({ habit, weeks }: { habit: Habit; weeks: WeekRate[] }) {
  const style = HABIT_STYLE[habit.color]
  const known = weeks.filter((w) => w.rate !== null)
  const summary = known.length === 0 ? 'Belum ada data.' : `Dari ${pct(known[0].rate)} di minggu pertama ke ${pct(known[known.length - 1].rate)} di minggu terakhir.`

  return (
    <section aria-label="Tren mingguan" className="rounded-card border bg-surface p-4">
      <h3 className="font-medium">Tren {weeks.length} minggu</h3>
      <p className="mt-0.5 text-xs text-muted">Persentase hari terjadwal yang selesai tiap minggu.</p>
      <div role="img" aria-label={`Tren ${weeks.length} minggu. ${summary}`} className="mt-4 flex h-28 items-end gap-1.5">
        {weeks.map((week, i) => (
          <div key={week.start} title={`${fmt(week.start, 'd MMM')}: ${pct(week.rate)}`} className="flex h-full min-w-0 flex-1 flex-col justify-end">
            {week.rate === null ? (
              <span className="h-px bg-line" />
            ) : (
              <span className={cn('block min-h-1 rounded-t-[3px]', i === weeks.length - 1 ? style.tint : style.solid)} style={{ height: `${Math.max(4, week.rate * 100)}%` }} />
            )}
          </div>
        ))}
      </div>
      <div aria-hidden className="mt-1.5 flex justify-between text-xs text-muted">
        <span>{fmt(weeks[0].start, 'd MMM')}</span>
        <span>Minggu ini</span>
      </div>
    </section>
  )
}
