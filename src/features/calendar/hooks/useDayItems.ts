import { useEffect, useMemo } from 'react'
import { loadEventRange, useEventStore, useProjectStore, useTaskStore } from '@/stores/entities'
import { buildDayItems } from '../lib/calendarItems'
import { paddedRange, toIsoRange } from '../lib/range'
import type { DateRange } from '../lib/recurrence'
import { useCalendarStore } from '../store'

/** Items per day for a range, with the calendar filters applied. The single source for dots, chips, density and agenda. Pass a memoized range. */
export function useDayItems(range: DateRange) {
  const events = useEventStore((s) => s.items)
  const tasks = useTaskStore((s) => s.items)
  const projects = useProjectStore((s) => s.items)
  const hiddenCategoryIds = useCalendarStore((s) => s.hiddenCategoryIds)
  const showTasks = useCalendarStore((s) => s.showTasks)
  const showMilestones = useCalendarStore((s) => s.showMilestones)

  useEffect(() => {
    void loadEventRange(toIsoRange(paddedRange(range)))
  }, [range])

  return useMemo(
    () => buildDayItems(events, tasks, range, { hiddenCategoryIds, showTasks, showMilestones }, projects),
    [events, tasks, projects, range, hiddenCategoryIds, showTasks, showMilestones],
  )
}
