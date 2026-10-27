import { Trophy } from '@phosphor-icons/react'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/cn'
import { STREAK_MILESTONES, TOTAL_MILESTONES, milestonesOf, type MilestoneStatus } from '@/lib/habitInsights'
import type { Habit } from '@/types/domain'
import { HABIT_STYLE } from '../habitUi'

interface MilestonesProps {
  habit: Habit
  bestStreak: number
  currentStreak: number
  completedDays: number
}

function Track({ title, unit, status, current, habit }: { title: string; unit: string; status: MilestoneStatus; current: number; habit: Habit }) {
  const style = HABIT_STYLE[habit.color]
  return (
    <div>
      <h4 className="text-sm font-medium">{title}</h4>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {status.reached.length === 0 && <li className="text-sm text-muted">Belum ada yang tercapai.</li>}
        {status.reached.map((m) => (
          <li key={m} className={cn('flex items-center gap-1 rounded-chip px-2 py-0.5 text-xs font-medium tabular-nums', style.tint, style.text)}>
            <Trophy size={12} weight="fill" aria-hidden />
            {m} {unit}
          </li>
        ))}
      </ul>
      {status.next !== null && (
        <div className="mt-2">
          <ProgressBar value={Math.min(100, Math.round((current / status.next) * 100))} label={`Menuju ${status.next} ${unit}`} />
          <p className="mt-1 text-xs text-muted">
            Berikutnya {status.next} {unit}: tinggal <span className="tabular-nums">{status.remaining}</span> lagi.
          </p>
        </div>
      )}
    </div>
  )
}

export function Milestones({ habit, bestStreak, currentStreak, completedDays }: MilestonesProps) {
  return (
    <section aria-label="Pencapaian" className="space-y-4 rounded-card border bg-surface p-4">
      <h3 className="font-medium">Pencapaian</h3>
      <Track title="Streak" unit="hari berturut-turut" status={milestonesOf(bestStreak, currentStreak, STREAK_MILESTONES)} current={currentStreak} habit={habit} />
      <Track title="Total selesai" unit="hari" status={milestonesOf(completedDays, completedDays, TOTAL_MILESTONES)} current={completedDays} habit={habit} />
    </section>
  )
}
