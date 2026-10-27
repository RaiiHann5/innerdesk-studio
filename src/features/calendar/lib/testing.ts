import type { CalendarEvent } from '@/types/domain'

/** Event factory for unit tests. Dates are local time so tests do not depend on the machine's zone. */
export function makeEvent(overrides: Partial<Omit<CalendarEvent, 'start' | 'end'>> & { start: Date; end: Date }): CalendarEvent {
  const { start, end, ...rest } = overrides
  return {
    id: 'evt-1',
    title: 'Contoh',
    allDay: false,
    categoryId: 'cat-kerja',
    reminders: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...rest,
    start: start.toISOString(),
    end: end.toISOString(),
  }
}
