import { useEffect } from 'react'
import { useCalendarStore } from '../store'
import type { CalendarView } from '../lib/range'

const VIEW_KEYS: Record<string, CalendarView> = { d: 'day', w: 'week', m: 'month', y: 'year' }

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

interface Handlers {
  next: () => void
  prev: () => void
  today: () => void
  newEvent: () => void
  /** The shortcuts sheet. Opened with "?" or Shift+/. */
  help: () => void
}

/** T today, D/W/M/Y switch view, J/K or the arrow keys page, N opens a new event, ? lists them all. Ignored while typing or with a modifier held. */
export function useCalendarHotkeys({ next, prev, today, newEvent, help }: Handlers) {
  const setView = useCalendarStore((s) => s.setView)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      const key = e.key.toLowerCase()
      if (e.key === '?') help()
      else if (key === 't') today()
      else if (key === 'n') newEvent()
      else if (key in VIEW_KEYS) setView(VIEW_KEYS[key])
      else if (key === 'j' || key === 'arrowright') next()
      else if (key === 'k' || key === 'arrowleft') prev()
      else return
      e.preventDefault()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [next, prev, today, newEvent, help, setView])
}
