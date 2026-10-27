import { CalendarCheck, ChartLineUp, Sparkle, type Icon } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { isoDay } from '@/lib/date'
import type { MoodEntry } from '@/types/domain'
import { MIN_ENTRIES, computeInsights } from './lib/insights'
import { FACTOR_BY_ID } from './lib/levels'

const WEEKDAY = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
const fixed = (n: number) => n.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function Row({ icon: IconComponent, title, children }: { icon: Icon; title: string; children: string }) {
  return (
    <li className="flex gap-3">
      <IconComponent size={18} className="mt-0.5 shrink-0 text-muted" aria-hidden />
      <div>
        <h3 className="font-ui text-sm font-medium">{title}</h3>
        <p className="mt-0.5 text-sm text-muted">{children}</p>
      </div>
    </li>
  )
}

const NOT_ENOUGH = 'Belum cukup data.'

interface InsightListProps {
  entries: MoodEntry[]
}

/** Three patterns computed on this device. Fewer than seven entries shows no pattern at all. */
export function InsightList({ entries }: InsightListProps) {
  const insights = useMemo(() => computeInsights(entries, isoDay(0)), [entries])

  if (!insights.enough) {
    return (
      <p className="text-sm text-muted">
        Belum cukup data untuk melihat pola. Baru {entries.length} dari {MIN_ENTRIES} hari tercatat.
      </p>
    )
  }

  const { weekComparison: week, bestWeekday: best, goodDayFactor: factor } = insights
  const weekText = week
    ? `${fixed(week.thisWeek)} dari 5, ${
        Math.abs(week.diff) < 0.05 ? 'sama dengan' : `${week.diff > 0 ? 'naik' : 'turun'} ${fixed(Math.abs(week.diff))} dari`
      } minggu lalu (${fixed(week.lastWeek)}).`
    : NOT_ENOUGH

  return (
    <ul className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
      <Row icon={ChartLineUp} title="Minggu ini dibanding minggu lalu">
        {weekText}
      </Row>
      <Row icon={CalendarCheck} title="Hari terbaik">
        {best ? `${WEEKDAY[best.weekday - 1]}, rata-rata ${fixed(best.average)} dari 5 (${best.count} catatan).` : NOT_ENOUGH}
      </Row>
      <Row icon={Sparkle} title="Faktor di hari baik">
        {factor
          ? `${FACTOR_BY_ID[factor.factor].label} muncul di ${factor.count} dari ${factor.goodDays} hari dengan suasana baik.`
          : NOT_ENOUGH}
      </Row>
    </ul>
  )
}
