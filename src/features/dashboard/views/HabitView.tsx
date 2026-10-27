import { Link } from 'react-router-dom'
import { Fire, Repeat } from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StoreGate } from '@/components/ui/StoreGate'
import { HabitIconTile } from '@/features/habits/HabitIconTile'
import { TodayControl } from '@/features/habits/TodayControl'
import { useHabitData } from '@/features/habits/useHabitData'
import { describeTarget, isScheduled, streakOf, summarizeDay } from '@/lib/habits'
import { useHabitLogStore, useHabitStore } from '@/stores/entities'
import { ViewSkeleton } from './ViewSkeleton'

const STORES = [useHabitStore, useHabitLogStore]

const linkClass = 'inline-flex h-8 items-center rounded-control bg-accent px-3 text-sm font-medium text-accent-on hover:bg-accent-hover'

/** Today's habits, due ones first, each with the same check or stepper as the Kebiasaan page. */
function Habits() {
  const { active, index, today } = useHabitData()

  if (active.length === 0) {
    return (
      <EmptyState
        icon={Repeat}
        title="Belum ada kebiasaan"
        description="Tambahkan kebiasaan kecil, lalu centang di sini setiap hari."
        action={
          <Link to="/habits" className={linkClass}>
            Buat kebiasaan
          </Link>
        }
      />
    )
  }

  const { done, total } = summarizeDay(active, index, today)
  const dueFirst = [...active].sort((a, b) => Number(isScheduled(b, today)) - Number(isScheduled(a, today)))

  return (
    <section aria-label="Kebiasaan hari ini" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-md font-bold">
            {done} dari {total} selesai hari ini
          </h2>
          <ProgressBar value={total === 0 ? 0 : Math.round((done / total) * 100)} label="Kebiasaan selesai hari ini" className="mt-2 max-w-xs" />
        </div>
        <Link to="/habits" className="text-sm font-medium text-accent-text hover:underline">
          Buka Kebiasaan
        </Link>
      </div>
      <ul className="grid gap-2 lg:grid-cols-2">
        {dueFirst.map((habit) => {
          const { current } = streakOf(habit, index, today)
          return (
            <li key={habit.id} className="flex items-center gap-3 rounded-card border bg-surface p-3">
              <HabitIconTile habit={habit} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  <Link to={`/habits/${habit.id}`} className="hover:underline">
                    {habit.name}
                  </Link>
                </p>
                <p className="flex items-center gap-2 text-xs text-muted">
                  <span className="truncate">{describeTarget(habit)}</span>
                  {current > 0 && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 font-medium tabular-nums text-status-doing">
                      <Fire size={12} weight="fill" aria-hidden />
                      {current}
                      <span className="sr-only"> hari berturut-turut</span>
                    </span>
                  )}
                </p>
              </div>
              <TodayControl habit={habit} index={index} date={today} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function HabitView() {
  return (
    <StoreGate stores={STORES} skeleton={<ViewSkeleton columns={2} />}>
      <Habits />
    </StoreGate>
  )
}
