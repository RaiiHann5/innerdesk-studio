import { useId, useMemo } from 'react'
import { fmt, isoDay } from '@/lib/date'
import type { MoodEntry } from '@/types/domain'
import { useElementWidth } from './hooks/useElementWidth'
import { average } from './lib/insights'
import { MOOD_LEVELS } from './lib/levels'
import { lastDays, runsOf, trendSummary } from './lib/series'

interface MoodTrendChartProps {
  entries: MoodEntry[]
  days?: number
}

const HEIGHT = 200
const PAD = { top: 10, right: 12, bottom: 26, left: 24 }
const fixed = (n: number) => n.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** Line chart of the last `days` days with the average as a dashed line. Gaps break the line. */
export function MoodTrendChart({ entries, days = 30 }: MoodTrendChartProps) {
  const summaryId = useId()
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const points = useMemo(() => lastDays(entries, days, isoDay(0)), [entries, days])
  const runs = useMemo(() => runsOf(points), [points])
  const logged = points.flatMap((p) => (p.level === null ? [] : [p.level]))
  const avg = average(logged)

  const plotW = Math.max(width - PAD.left - PAD.right, 0)
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const x = (index: number) => PAD.left + (index / (days - 1)) * plotW
  const y = (level: number) => PAD.top + ((5 - level) / 4) * plotH
  const middle = Math.floor((days - 1) / 2)

  return (
    <div>
      <div ref={ref} className="w-full">
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={`Grafik garis suasana hati ${days} hari terakhir`}
            aria-describedby={summaryId}
          >
            {MOOD_LEVELS.map((level) => (
              <g key={level}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(level)} y2={y(level)} className="stroke-line" strokeWidth={1} />
                <text x={PAD.left - 8} y={y(level)} textAnchor="end" dominantBaseline="middle" className="fill-muted text-xs tabular-nums">
                  {level}
                </text>
              </g>
            ))}

            {avg !== null && (
              <g>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y(avg)}
                  y2={y(avg)}
                  className="stroke-muted"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <text
                  x={width - PAD.right - 4}
                  y={y(avg) - 6}
                  textAnchor="end"
                  className="fill-muted text-xs tabular-nums [paint-order:stroke] stroke-surface"
                  strokeWidth={4}
                >
                  Rata-rata {fixed(avg)}
                </text>
              </g>
            )}

            {runs.map((run) =>
              run.length > 1 ? (
                <polyline
                  key={run[0].index}
                  points={run.map((p) => `${x(p.index)},${y(p.level)}`).join(' ')}
                  fill="none"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className="stroke-accent-text"
                />
              ) : null,
            )}
            {points.map((point, index) =>
              point.level === null ? null : (
                <circle key={point.date} cx={x(index)} cy={y(point.level)} r={3.5} className="fill-accent-text stroke-surface" strokeWidth={1.5}>
                  <title>{`${fmt(point.date, 'd MMM')}: ${point.level} dari 5`}</title>
                </circle>
              ),
            )}

            <text x={x(0)} y={HEIGHT - 6} textAnchor="start" className="fill-muted text-xs">
              {fmt(points[0].date, 'd MMM')}
            </text>
            <text x={x(middle)} y={HEIGHT - 6} textAnchor="middle" className="fill-muted text-xs">
              {fmt(points[middle].date, 'd MMM')}
            </text>
            <text x={x(days - 1)} y={HEIGHT - 6} textAnchor="end" className="fill-muted text-xs">
              Hari ini
            </text>
          </svg>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">Skala 1 (Berat) sampai 5 (Sangat baik). Hari tanpa catatan dilewati.</p>
      <p id={summaryId} className="sr-only">
        {trendSummary(points)}
      </p>
    </div>
  )
}
