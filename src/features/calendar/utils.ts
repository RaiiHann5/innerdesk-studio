import { isSameDay, parseISO } from 'date-fns'
import type { CalendarEvent } from '@/types/domain'

export const WEEKDAYS_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export const eventsOn = (events: CalendarEvent[], day: Date) =>
  events.filter((e) => isSameDay(parseISO(e.start), day)).sort((a, b) => a.start.localeCompare(b.start))
