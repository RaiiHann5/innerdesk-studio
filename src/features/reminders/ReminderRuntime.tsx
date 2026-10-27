import { useEffect } from 'react'
import { loadFired, saveFired } from '@/lib/reminders'
import { useEventStore, useHabitLogStore, useHabitStore } from '@/stores/entities'
import { deliverReminder } from './deliver'
import { reminderTick } from './tick'

const TICK_MS = 15_000

/**
 * Fires calendar and habit reminders. It renders nothing and sits above the router, like FocusRuntime, so a reminder
 * arrives on whichever page is open. It only runs while the app is open in a browser tab: there is no service worker,
 * so nothing can reach a closed tab.
 */
export function ReminderRuntime() {
  useEffect(() => {
    let last: number | null = null
    let fired = loadFired()

    const tick = () => {
      const now = Date.now()
      const events = useEventStore.getState()
      const habits = useHabitStore.getState()
      const logs = useHabitLogStore.getState()
      // Before the data is loaded there is nothing to remind about, and `last` must not move past reminders not yet seen.
      if (events.status !== 'ready' || habits.status !== 'ready' || logs.status !== 'ready') return

      const due = reminderTick({ now, last, events: events.items, habits: habits.items, logs: logs.items, fired })
      last = now
      if (due.length === 0) return
      for (const reminder of due) {
        deliverReminder(reminder)
        fired = { ...fired, [reminder.key]: now }
      }
      fired = saveFired(fired, now)
    }

    tick()
    const timer = window.setInterval(tick, TICK_MS)
    return () => window.clearInterval(timer)
  }, [])

  return null
}
