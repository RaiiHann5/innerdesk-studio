import { memo } from 'react'
import { GUTTER_PX, HOURS_PER_DAY, HOUR_HEIGHT } from './lib/timeGeometry'

const HOURS = Array.from({ length: HOURS_PER_DAY }, (_, h) => h)

/** Hour labels, 24h and tabular. 00:00 has no label: it is the top edge. Static, so it never re-renders with the data. */
export const HourGutter = memo(function HourGutter() {
  return (
    <div aria-hidden className="relative shrink-0" style={{ width: GUTTER_PX }}>
      {HOURS.slice(1).map((h) => (
        <span
          key={h}
          className="absolute right-2 -translate-y-1/2 text-xs tabular-nums text-muted"
          style={{ top: h * HOUR_HEIGHT }}
        >
          {String(h).padStart(2, '0')}:00
        </span>
      ))}
    </div>
  )
})

/** Hairline at every hour, a fainter one at every half hour. Drawn once behind all columns. */
export const HourLines = memo(function HourLines() {
  return (
    <div aria-hidden className="absolute inset-0">
      {HOURS.map((h) => (
        <div key={h} className="absolute inset-x-0" style={{ top: h * HOUR_HEIGHT }}>
          {h > 0 && <div className="border-t" />}
          <div className="absolute inset-x-0 border-t border-line/50" style={{ top: HOUR_HEIGHT / 2 }} />
        </div>
      ))}
    </div>
  )
})
