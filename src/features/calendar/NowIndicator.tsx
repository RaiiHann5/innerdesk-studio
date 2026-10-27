import { isSameDay } from 'date-fns'
import { fmt } from '@/lib/date'
import { useNow } from './hooks/useNow'
import { GUTTER_PX, minutesToPx } from './lib/timeGeometry'

interface NowIndicatorProps {
  days: Date[]
}

/**
 * The current-time line: a 1px orange rule across today's column and a pill with the time in the gutter.
 * It owns the clock, so the minute tick re-renders only this component. Renders nothing when today is not visible.
 */
export function NowIndicator({ days }: NowIndicatorProps) {
  const now = useNow()
  if (!days.some((d) => isSameDay(d, now))) return null
  const top = minutesToPx(now.getHours() * 60 + now.getMinutes())

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 z-20 flex h-0" style={{ top }}>
      <div className="relative shrink-0" style={{ width: GUTTER_PX }}>
        {/* The surface-coloured box hides the hour label that sits close to the line, so the pill never overprints it. */}
        <div className="absolute inset-x-0 flex -translate-y-1/2 justify-end bg-surface py-3 pr-1">
          <span className="rounded-chip bg-accent px-1 text-xs font-medium tabular-nums text-accent-on">{fmt(now, 'HH:mm')}</span>
        </div>
      </div>
      <div className="grid min-w-0 flex-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
        {days.map((d) => (
          <div key={d.getTime()} className="relative">
            {isSameDay(d, now) && (
              <>
                <span className="absolute inset-x-0 h-px -translate-y-1/2 bg-accent" />
                <span className="absolute left-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
