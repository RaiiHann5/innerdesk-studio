import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, ArrowCounterClockwise, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { timeAgo } from '@/lib/date'
import { describeDays } from '@/lib/habits'
import type { Habit } from '@/types/domain'
import { deleteHabitWithUndo, unarchiveHabit } from './habitActions'
import { HabitIconTile } from './HabitIconTile'

export function ArchivedHabits({ habits }: { habits: Habit[] }) {
  const [deleting, setDeleting] = useState<Habit | null>(null)

  if (habits.length === 0) {
    return <EmptyState icon={Archive} title="Arsip kosong" description="Kebiasaan yang kamu hentikan sementara disimpan di sini, lengkap dengan riwayatnya." />
  }

  return (
    <>
      <ul className="space-y-2">
        {habits.map((habit) => (
          <li key={habit.id} className="flex flex-wrap items-center gap-3 rounded-card border bg-surface p-3">
            <HabitIconTile habit={habit} className="opacity-60" />
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-medium">
                <Link to={`/habits/${habit.id}`} className="hover:underline">
                  {habit.name}
                </Link>
              </h3>
              <p className="text-xs text-muted">
                {describeDays(habit.days)}
                {habit.archivedAt && ` · diarsipkan ${timeAgo(habit.archivedAt)}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button onClick={() => void unarchiveHabit(habit)}>
                <ArrowCounterClockwise aria-hidden />
                Pulihkan
              </Button>
              <Button variant="ghost" onClick={() => setDeleting(habit)} aria-label={`Hapus ${habit.name} permanen`} className="text-status-overdue hover:text-status-overdue">
                <Trash aria-hidden />
                Hapus
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={deleting !== null}
        label="Hapus kebiasaan"
        title={deleting ? `Hapus “${deleting.name}”?` : ''}
        description="Kebiasaan dan seluruh riwayatnya dihapus. Kamu masih bisa mengurungkannya sebentar lewat notifikasi."
        confirmLabel="Hapus"
        destructive
        onConfirm={() => deleting && void deleteHabitWithUndo(deleting)}
        onClose={() => setDeleting(null)}
      />
    </>
  )
}
