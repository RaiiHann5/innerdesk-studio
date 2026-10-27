import { useMemo } from 'react'
import { toISODate } from '@/lib/date'
import { indexLogs, sortHabits } from '@/lib/habits'
import { useNow } from '@/lib/useNow'
import { useHabitLogStore, useHabitStore, useMoodStore } from '@/stores/entities'

/** Everything the habit views read: habits split by archive, the log index, the moods, and today's date. */
export function useHabitData() {
  const habits = useHabitStore((s) => s.items)
  const logs = useHabitLogStore((s) => s.items)
  const moods = useMoodStore((s) => s.items)
  // Once a minute is enough to roll over at midnight without keeping the page busy.
  const today = toISODate(useNow(60_000))

  return useMemo(
    () => ({
      today,
      moods,
      logs,
      index: indexLogs(logs),
      active: sortHabits(habits.filter((h) => !h.archivedAt)),
      archived: sortHabits(habits.filter((h) => h.archivedAt)),
    }),
    [habits, logs, moods, today],
  )
}
