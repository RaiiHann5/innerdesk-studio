import { useMemo } from 'react'
import { addDays, getISODay, startOfWeek } from 'date-fns'
import { Skeleton } from '@/components/ui/Skeleton'
import { StoreGate } from '@/components/ui/StoreGate'
import { formatMinutes, toISODate } from '@/lib/date'
import { useFocusStore, useTaskStore } from '@/stores/entities'
import { focusSecondsByDay } from '@/features/focus/lib/focusSelectors'

const STORES = [useTaskStore, useFocusStore]
const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const W = 280
const H = 132
const X0 = 26
const X1 = 260
const Y_TOP = 36
const Y_BASE = 100

type Point = [number, number]

/** Catmull-Rom to cubic Bezier, clamped so the curve never dips under the baseline. */
function smoothPath(pts: Point[]): string {
  if (pts.length === 0) return ''
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const clampY = (y: number) => Math.min(Y_BASE, Math.max(Y_TOP, y))
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${clampY(p1[1] + (p2[1] - p0[1]) / 6)} ${p2[0] - (p3[0] - p1[0]) / 6},${clampY(p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]},${p2[1]}`
  }
  return d
}

function Chart() {
  const tasks = useTaskStore((s) => s.items)
  const sessions = useFocusStore((s) => s.items)
  const now = new Date()
  const todayIndex = getISODay(now) - 1

  const minutes = useMemo(() => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
    // Completed blocks on a task are already in that task's time log, so they are left out here.
    const focusByDay = focusSecondsByDay(sessions, new Set(tasks.map((t) => t.id)))
    return DAY_LABELS.map((_, i) => {
      const iso = toISODate(addDays(monday, i))
      const logged = tasks.reduce((sum, t) => sum + t.timeLog.filter((l) => l.date === iso).reduce((n, l) => n + l.minutes, 0), 0)
      return logged + Math.round((focusByDay.get(iso) ?? 0) / 60)
    })
  }, [tasks, sessions])

  const total = minutes.reduce((a, b) => a + b, 0)
  const maxHours = Math.max(2, Math.ceil(Math.max(...minutes) / 60 / 2) * 2)
  const x = (i: number) => X0 + (i * (X1 - X0)) / 6
  const y = (m: number) => Y_BASE - (m / 60 / maxHours) * (Y_BASE - Y_TOP)
  const points: Point[] = minutes.slice(0, todayIndex + 1).map((m, i) => [x(i), y(m)])
  const line = smoothPath(points)
  const area = points.length > 1 ? `${line} L${points[points.length - 1][0]},${Y_BASE} L${points[0][0]},${Y_BASE} Z` : ''
  const marker = points[points.length - 1]

  return (
    <div>
      <p className="font-display text-xl font-bold tabular-nums">{formatMinutes(total)}</p>
      <p className="text-xs text-muted">Waktu tercatat minggu ini</p>

      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Grafik waktu tercatat per hari minggu ini, total ${formatMinutes(total)}`} className="mt-3 w-full">
        {[0, maxHours / 2, maxHours].map((h) => (
          <g key={h}>
            <line x1={X0} x2={X1} y1={y(h * 60)} y2={y(h * 60)} className="stroke-line" strokeWidth="1" />
            <text x={X0 - 6} y={y(h * 60) + 4} textAnchor="end" className="fill-muted text-xs tabular-nums">
              {h}j
            </text>
          </g>
        ))}
        {area && <path d={area} className="fill-ink/5" />}
        {line && <path d={line} fill="none" className="stroke-ink" strokeWidth="1.5" strokeLinecap="round" />}
        {marker && (
          <g>
            <line x1={marker[0]} x2={marker[0]} y1={marker[1]} y2={Y_BASE} className="stroke-ink" strokeWidth="1" strokeDasharray="2 3" />
            <circle cx={marker[0]} cy={marker[1]} r="4.5" className="fill-accent stroke-surface" strokeWidth="2" />
            <rect x={marker[0] - 26} y={marker[1] - 28} width="52" height="18" rx="6" className="fill-ink" />
            <text x={marker[0]} y={marker[1] - 15.5} textAnchor="middle" className="fill-bg text-xs font-medium">
              Sekarang
            </text>
          </g>
        )}
        {DAY_LABELS.map((label, i) => (
          <text key={label} x={x(i)} y={H - 8} textAnchor="middle" className={i === todayIndex ? 'fill-ink text-xs font-medium' : 'fill-muted text-xs'}>
            {label}
          </text>
        ))}
      </svg>

      <table className="sr-only">
        <caption>Waktu tercatat per hari</caption>
        <tbody>
          {DAY_LABELS.map((label, i) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{formatMinutes(minutes[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TimeManagement() {
  return (
    <section aria-labelledby="time-heading">
      <h2 id="time-heading" className="mb-3 text-md font-bold">
        Manajemen waktu
      </h2>
      <StoreGate stores={STORES} skeleton={<Skeleton className="h-44" />}>
        <Chart />
      </StoreGate>
    </section>
  )
}
