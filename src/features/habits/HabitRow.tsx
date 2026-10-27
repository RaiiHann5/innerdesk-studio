import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, Fire, PencilSimple, Trash } from '@phosphor-icons/react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { describeDays, describeTarget, streakOf, type LogIndex } from '@/lib/habits'
import type { Habit } from '@/types/domain'
import { archiveHabitWithUndo, deleteHabitWithUndo } from './habitActions'
import { HabitDialog } from './HabitDialog'
import { HabitIconTile } from './HabitIconTile'
import { TodayControl } from './TodayControl'
import { WeekStrip } from './WeekStrip'

interface HabitRowProps {
  habit: Habit
  index: LogIndex
  today: string
}

/** One habit on the daily list: what it is, its streak, the last week, and the control for today. */
export function HabitRow({ habit, index, today }: HabitRowProps) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { current } = streakOf(habit, index, today)

  const items: MenuItem[] = [
    { label: 'Ubah', icon: PencilSimple, onSelect: () => setEditing(true) },
    { label: 'Arsipkan', icon: Archive, onSelect: () => void archiveHabitWithUndo(habit) },
    { label: 'Hapus', icon: Trash, tone: 'danger', onSelect: () => setDeleting(true) },
  ]

  return (
    <li className="rounded-card border bg-surface p-3 md:p-4">
      <div className="flex items-start gap-3">
        <HabitIconTile habit={habit} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <h3 className="min-w-0 truncate font-medium">
              <Link to={`/habits/${habit.id}`} className="hover:underline" title="Buka detail dan jurnal">
                {habit.name}
              </Link>
            </h3>
            {current > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium tabular-nums text-status-doing" title="Streak saat ini">
                <Fire size={14} weight="fill" aria-hidden />
                {current} hari
                <span className="sr-only"> berturut-turut</span>
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {describeDays(habit.days)} · {describeTarget(habit)}
            {habit.reminderTime && ` · pengingat ${habit.reminderTime.replace(':', '.')}`}
          </p>
          {habit.description && <p className="mt-1 text-sm text-muted">{habit.description}</p>}
        </div>
        <Menu label={`Menu untuk ${habit.name}`} items={items} className="-mr-1 -mt-1" />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <WeekStrip habit={habit} index={index} today={today} />
        <TodayControl habit={habit} index={index} date={today} />
      </div>

      <HabitDialog open={editing} habit={habit} onClose={() => setEditing(false)} />
      <ConfirmDialog
        open={deleting}
        label="Hapus kebiasaan"
        title={`Hapus “${habit.name}”?`}
        description="Kebiasaan dan seluruh riwayatnya dihapus. Kalau hanya ingin berhenti sementara, arsipkan saja: riwayatnya tetap ada."
        confirmLabel="Hapus"
        destructive
        onConfirm={() => void deleteHabitWithUndo(habit)}
        onClose={() => setDeleting(false)}
      />
    </li>
  )
}
