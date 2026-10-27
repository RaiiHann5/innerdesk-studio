import { useCallback, useMemo } from 'react'
import { isSameDay, isValid, parseISO } from 'date-fns'
import { useCalendarStore } from '../store'
import { getVisibleRange, periodTitle, shiftDate } from '../lib/range'

/** The visible range for the current view, plus navigation. Everything that depends on "where am I" reads this. */
export function useCalendarRange() {
  const view = useCalendarStore((s) => s.view)
  const focusedDate = useCalendarStore((s) => s.focusedDate)
  const setFocusedDate = useCalendarStore((s) => s.setFocusedDate)

  const focused = useMemo(() => {
    const parsed = parseISO(focusedDate)
    return isValid(parsed) ? parsed : new Date()
  }, [focusedDate])
  const range = useMemo(() => getVisibleRange(view, focused), [view, focused])
  const title = useMemo(() => periodTitle(view, focused), [view, focused])

  const next = useCallback(() => setFocusedDate(shiftDate(view, focused, 1)), [view, focused, setFocusedDate])
  const prev = useCallback(() => setFocusedDate(shiftDate(view, focused, -1)), [view, focused, setFocusedDate])
  const today = useCallback(() => setFocusedDate(new Date()), [setFocusedDate])

  return { view, focused, range, title, next, prev, today, isOnToday: isSameDay(focused, new Date()) }
}
