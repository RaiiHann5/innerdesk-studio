import { useMemo } from 'react'
import { Heartbeat } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import type { MoodEntry } from '@/types/domain'
import { MoodEntryCard } from './MoodEntryCard'

interface MoodRecentListProps {
  entries: MoodEntry[]
  limit?: number
  onEdit: (entry: MoodEntry) => void
  onDelete: (entry: MoodEntry) => void
  onStart: () => void
}

export function MoodRecentList({ entries, limit = 7, onEdit, onDelete, onStart }: MoodRecentListProps) {
  const recent = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit), [entries, limit])

  return (
    <section aria-labelledby="recent-title" className="space-y-3">
      <h2 id="recent-title" className="text-md font-bold tracking-tight">
        Catatan terbaru
      </h2>
      {recent.length === 0 ? (
        <EmptyState
          icon={Heartbeat}
          title="Belum ada catatan"
          description="Catat suasana hatimu hari ini, dan riwayatnya akan muncul di sini."
          action={<Button variant="primary" onClick={onStart}>Catat hari ini</Button>}
        />
      ) : (
        <ul className="space-y-2">
          {recent.map((entry) => (
            <li key={entry.id}>
              <MoodEntryCard entry={entry} onEdit={onEdit} onDelete={onDelete} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
