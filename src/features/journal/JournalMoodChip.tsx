import { Link } from 'react-router-dom'
import { useMoodStore } from '@/stores/entities'
import { MoodLevelChip } from '@/features/mood/MoodLevelChip'

/** The day's mood, read-only. Changing it happens on the mood page, so there is one place that owns it. */
export function JournalMoodChip({ date }: { date: string }) {
  const entry = useMoodStore((s) => s.items.find((e) => e.date === date))
  const href = `/mood?date=${date}`
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="text-muted">Mood</span>
      {entry ? (
        <>
          <MoodLevelChip level={entry.level} />
          <Link to={href} className="text-accent-text underline-offset-2 hover:underline">
            Ubah
          </Link>
        </>
      ) : (
        <>
          <span className="text-muted">belum dicatat</span>
          <Link to={href} className="text-accent-text underline-offset-2 hover:underline">
            Catat mood
          </Link>
        </>
      )}
    </p>
  )
}
