import { useMemo } from 'react'
import { addDays, isToday, startOfWeek } from 'date-fns'
import { cn } from '@/lib/cn'
import { formatMinutes, toISODate } from '@/lib/date'

const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const BASE = 72
const TOP = 12

interface WeeklyChartProps {
  /** Seconds per local date key, from the shared selector. */
  totals: Map<string, number>
  className?: string
}

/** Seven bars of focus time. Flat rectangles, no curve: this is a count, not a trend line. */
export function WeeklyChart({ totals, className }: WeeklyChartProps) {
  const days = useMemo(() => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  }, [])

  const minutes = days.map((day) => Math.round((totals.get(toISODate(day)) ?? 0) / 60))
  const maxMinutes = Math.max(30, ...minutes)
  const total = minutes.reduce((a, b) => a + b, 0)

  return (
    <section aria-label="Fokus tujuh hari" className={className}>
      <header className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold">Minggu ini</h3>
        <span className="text-xs tabular-nums text-muted">{formatMinutes(total * 60)}</span>
      </header>
      <div className="flex h-[96px] items-end gap-[10px]" role="img" aria-label={`Fokus minggu ini, total ${formatMinutes(total * 60)}`}>
        {minutes.map((m, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
            <div
              className={cn('w-full max-w-7 rounded-t-chip', isToday(days[i]) ? 'bg-accent' : 'bg-accent/40')}
              style={{ height: Math.max(2, (m / maxMinutes) * (BASE - TOP)) }}
            />
            <span className="text-[10px] tabular-nums text-muted">{m || ''}</span>
            <span className="text-[10px] text-muted">{DAY_LABELS[i]}</span>
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>Menit fokus per hari</caption>
        <tbody>
          {minutes.map((m, i) => (
            <tr key={i}>
              <th scope="row">{DAY_LABELS[i]}</th>
              <td>{m} menit</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}