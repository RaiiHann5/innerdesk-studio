import { addDays, eachDayOfInterval, isToday, startOfWeek } from 'date-fns'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/date'
import type { CalendarEvent } from '@/types/domain'
import { WeekEventChip } from './WeekEventChip'
import { WEEKDAYS_SHORT, eventsOn } from './utils'

export function WeekGrid({ anchor, events }: { anchor: Date; events: CalendarEvent[] }) {
  const start = startOfWeek(anchor, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start, end: addDays(start, 6) })

  return (
    <div className="grid divide-y overflow-hidden rounded-card border bg-surface md:grid-cols-7 md:divide-x md:divide-y-0">
      {days.map((day, i) => {
        const items = eventsOn(events, day)
        return (
          <section key={day.toISOString()} aria-label={fmt(day, 'EEEE, d MMMM')} className="min-h-24 p-2 md:min-h-44">
            <p className="flex items-center gap-1.5 text-xs text-muted">
              {WEEKDAYS_SHORT[i]}
              <span
                className={cn(
                  'grid h-5 min-w-5 place-items-center rounded-control px-1 font-medium tabular-nums',
                  isToday(day) ? 'bg-ink text-bg' : 'text-ink',
                )}
              >
                {fmt(day, 'd')}
              </span>
            </p>
            <div className="mt-2 space-y-1">
              {items.map((e) => (
                <WeekEventChip key={e.id} event={e} layout="stacked" />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
