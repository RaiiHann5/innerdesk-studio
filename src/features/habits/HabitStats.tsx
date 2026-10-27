import { Link } from 'react-router-dom'
import { Fire } from '@phosphor-icons/react'
import { describeDays, moodLink, overallRate, rateBetween, streakOf, summarizeDay, type LogIndex, type Rate } from '@/lib/habits'
import { isoDay } from '@/lib/date'
import type { Habit, MoodEntry } from '@/types/domain'
import { HabitHeatmap } from './HabitHeatmap'
import { HabitIconTile } from './HabitIconTile'

const percent = (rate: Rate) => (rate.rate === null ? '-' : `${Math.round(rate.rate * 100)}%`)
const oneDecimal = (n: number) => n.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-display text-lg font-bold tabular-nums">
        {value}
        {unit && <span className="ml-1 font-ui text-sm font-normal text-muted">{unit}</span>}
      </dd>
    </div>
  )
}

interface HabitStatsProps {
  habits: Habit[]
  index: LogIndex
  moods: MoodEntry[]
  today: string
}

/** Across every habit first, then one card per habit with its streaks, its last 30 days and twelve weeks of history. */
export function HabitStats({ habits, index, moods, today }: HabitStatsProps) {
  const from7 = isoDay(-6)
  const from30 = isoDay(-29)
  const day = summarizeDay(habits, index, today)
  const week = overallRate(habits, index, from7, today, today)
  const month = overallRate(habits, index, from30, today, today)

  return (
    <div className="space-y-4">
      <section aria-label="Ringkasan semua kebiasaan" className="rounded-card border bg-surface p-4">
        <dl className="grid grid-cols-3 gap-4">
          <Stat label="Selesai hari ini" value={`${day.done}/${day.total}`} />
          <Stat label="7 hari terakhir" value={percent(week)} />
          <Stat label="30 hari terakhir" value={percent(month)} />
        </dl>
        <p className="mt-3 text-xs text-muted">Persentase dihitung dari hari yang memang dijadwalkan.</p>
      </section>

      <ul className="grid gap-4 lg:grid-cols-2">
        {habits.map((habit) => {
          const { current, best } = streakOf(habit, index, today)
          const rate = rateBetween(habit, index, from30, today, today)
          const link = moodLink(habit, index, moods, today)
          return (
            <li key={habit.id} className="rounded-card border bg-surface p-4">
              <div className="flex items-center gap-3">
                <HabitIconTile habit={habit} />
                <div className="min-w-0">
                  <h3 className="truncate font-medium">
                    <Link to={`/habits/${habit.id}`} className="hover:underline">
                      {habit.name}
                    </Link>
                  </h3>
                  <p className="text-xs text-muted">{describeDays(habit.days)}</p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-4">
                <div>
                  <dt className="flex items-center gap-1 text-xs text-muted">
                    {current > 0 && <Fire size={12} weight="fill" aria-hidden className="text-status-doing" />}
                    Streak
                  </dt>
                  <dd className="mt-1 font-display text-lg font-bold tabular-nums">
                    {current} <span className="font-ui text-sm font-normal text-muted">hari</span>
                  </dd>
                </div>
                <Stat label="Terpanjang" value={String(best)} unit="hari" />
                <Stat label="30 hari" value={percent(rate)} />
              </dl>
              <div className="mt-4">
                <HabitHeatmap habit={habit} index={index} today={today} />
              </div>
              {link && (
                <p className="mt-4 rounded-control bg-sunken/60 p-3 text-sm text-muted">
                  Di hari kamu menyelesaikannya, suasana hatimu rata-rata <strong className="font-bold tabular-nums text-ink">{oneDecimal(link.withHabit)}</strong> dari 5, dibanding{' '}
                  <strong className="font-bold tabular-nums text-ink">{oneDecimal(link.withoutHabit)}</strong> di hari terjadwal yang terlewat. Ini pola dari catatanmu sendiri, belum tentu sebab-akibat.
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
