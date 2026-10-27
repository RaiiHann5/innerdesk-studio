import { describe, expect, it } from 'vitest'
import type { CalendarEvent, Habit, HabitLog } from '@/types/domain'
import { ALL_WEEKDAYS, indexLogs } from './habits'
import { ALL_DAY_HOUR, dueEventReminders, dueHabitReminders, isReminderTime, saveFired, unfired, FIRED_KEEP_MS } from './reminders'

// Local times throughout, as the app uses them. 2026-10-25 is a Sunday.
const at = (d: string, h = 0, m = 0) => new Date(`${d}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`)

const event = (fields: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'e1',
  createdAt: '',
  updatedAt: '',
  title: 'Rapat klien',
  start: at('2026-10-26', 10).toISOString(),
  end: at('2026-10-26', 11).toISOString(),
  allDay: false,
  categoryId: 'c',
  reminders: [10],
  ...fields,
})

describe('dueEventReminders', () => {
  it('fires 10 minutes before the start, and only inside the window', () => {
    const e = event()
    expect(dueEventReminders([e], at('2026-10-26', 9, 45), at('2026-10-26', 9, 51))).toHaveLength(1)
    expect(dueEventReminders([e], at('2026-10-26', 9, 51), at('2026-10-26', 9, 59))).toHaveLength(0)
    expect(dueEventReminders([e], at('2026-10-26', 9, 40), at('2026-10-26', 9, 50))).toHaveLength(0) // `to` is exclusive
    expect(dueEventReminders([e], at('2026-10-26', 9, 50), at('2026-10-26', 9, 51))).toHaveLength(1) // `from` is inclusive
  })

  it('says what and when', () => {
    const [r] = dueEventReminders([event({ location: 'Kantor klien' })], at('2026-10-26', 9, 0), at('2026-10-26', 10, 0))
    expect(r.title).toBe('Rapat klien')
    expect(r.body).toBe('10 menit lagi, pukul 10.00 · Kantor klien')
  })

  it('handles every offset, including a day ahead', () => {
    const e = event({ reminders: [10, 60, 1440] })
    const due = dueEventReminders([e], at('2026-10-25', 0), at('2026-10-27', 0))
    expect(due.map((r) => r.at)).toEqual([at('2026-10-25', 10), at('2026-10-26', 9), at('2026-10-26', 9, 50)].map((d) => d.getTime()))
    expect(due.map((r) => r.body)).toEqual(['Besok pukul 10.00', '1 jam lagi, pukul 10.00', '10 menit lagi, pukul 10.00'])
  })

  it('counts an all-day event from the morning', () => {
    const e = event({ allDay: true, start: at('2026-10-26').toISOString(), end: at('2026-10-27').toISOString(), reminders: [10, 1440] })
    const due = dueEventReminders([e], at('2026-10-25', 0), at('2026-10-27', 0))
    expect(due.map((r) => r.at)).toEqual([at('2026-10-25', ALL_DAY_HOUR).getTime(), at('2026-10-26', ALL_DAY_HOUR - 1, 50).getTime()])
    expect(due[0].body).toBe('Besok, seharian')
    expect(due[1].body).toBe('Hari ini, seharian')
  })

  it('gives each repeat of a repeating event its own reminder, with its own key', () => {
    const e = event({ recurrence: { freq: 'daily', exceptions: [] } })
    const due = dueEventReminders([e], at('2026-10-26', 0), at('2026-10-29', 0))
    expect(due).toHaveLength(3)
    expect(new Set(due.map((r) => r.key)).size).toBe(3)
  })

  it('skips a repeat that was removed', () => {
    const e = event({ recurrence: { freq: 'daily', exceptions: ['2026-10-27'] } })
    const due = dueEventReminders([e], at('2026-10-26', 0), at('2026-10-29', 0))
    expect(due.map((r) => r.at)).toEqual([at('2026-10-26', 9, 50), at('2026-10-28', 9, 50)].map((d) => d.getTime()))
  })

  it('ignores events with no reminders and events already over', () => {
    expect(dueEventReminders([event({ reminders: [] })], at('2026-10-20'), at('2026-10-30'))).toEqual([])
    expect(dueEventReminders([event()], at('2026-10-27', 0), at('2026-10-28', 0))).toEqual([])
  })

  it('gives the same key every time the same reminder is computed', () => {
    const e = event()
    const a = dueEventReminders([e], at('2026-10-26', 9, 0), at('2026-10-26', 10, 0))
    const b = dueEventReminders([e], at('2026-10-26', 9, 49), at('2026-10-26', 9, 55))
    expect(a[0].key).toBe(b[0].key)
  })
})

const habit = (fields: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  createdAt: '',
  updatedAt: '',
  name: 'Minum air',
  color: 'teal',
  icon: 'drop',
  days: ALL_WEEKDAYS,
  target: 1,
  startDate: '2026-10-01',
  order: 1000,
  reminderTime: '20:00',
  ...fields,
})
const log = (date: string, value: number): HabitLog => ({ id: `l-${date}`, createdAt: '', updatedAt: '', habitId: 'h1', date, value })

describe('dueHabitReminders', () => {
  const none = indexLogs([])

  it('fires at the set time on a due day', () => {
    const due = dueHabitReminders([habit()], none, at('2026-10-25', 19, 59), at('2026-10-25', 20, 1))
    expect(due).toHaveLength(1)
    expect(due[0]).toMatchObject({ key: 'habit|h1|2026-10-25', title: 'Minum air', body: 'Belum dicentang hari ini.' })
    expect(dueHabitReminders([habit()], none, at('2026-10-25', 20, 1), at('2026-10-25', 21, 0))).toHaveLength(0)
  })

  it('stays quiet once the habit is done, and for an unset, malformed, archived or not-due habit', () => {
    const done = indexLogs([log('2026-10-25', 1)])
    expect(dueHabitReminders([habit()], done, at('2026-10-25', 19), at('2026-10-25', 21))).toHaveLength(0)
    const window: [Date, Date] = [at('2026-10-25', 19), at('2026-10-25', 21)]
    expect(dueHabitReminders([habit({ reminderTime: undefined })], none, ...window)).toHaveLength(0)
    expect(dueHabitReminders([habit({ reminderTime: '8pm' })], none, ...window)).toHaveLength(0)
    expect(dueHabitReminders([habit({ archivedAt: '2026-10-01T00:00:00.000Z' })], none, ...window)).toHaveLength(0)
    expect(dueHabitReminders([habit({ days: [1, 2] })], none, ...window)).toHaveLength(0) // Sunday
  })

  it('does not remind before the habit started', () => {
    expect(dueHabitReminders([habit({ startDate: '2026-10-26' })], none, at('2026-10-25', 19), at('2026-10-25', 21))).toHaveLength(0)
  })

  it('reports progress on a counted habit', () => {
    const counted = habit({ target: 8, unit: 'gelas' })
    const [a] = dueHabitReminders([counted], none, at('2026-10-25', 19), at('2026-10-25', 21))
    const [b] = dueHabitReminders([counted], indexLogs([log('2026-10-25', 3)]), at('2026-10-25', 19), at('2026-10-25', 21))
    expect(a.body).toBe('Targetmu 8 gelas hari ini.')
    expect(b.body).toBe('Baru 3 dari 8 gelas hari ini.')
  })

  it('finds the right day when the window crosses midnight', () => {
    const late = habit({ reminderTime: '00:30' })
    const due = dueHabitReminders([late], none, at('2026-10-25', 23, 50), at('2026-10-26', 0, 40))
    expect(due.map((r) => r.key)).toEqual(['habit|h1|2026-10-26'])
  })
})

describe('isReminderTime', () => {
  it('accepts HH:mm only', () => {
    expect(['00:00', '07:05', '23:59'].every(isReminderTime)).toBe(true)
    expect(['24:00', '7:05', '07:60', '', '07:05:00'].some(isReminderTime)).toBe(false)
  })
})

describe('unfired and saveFired', () => {
  const r = (key: string, atMs: number) => ({ key, title: key, body: '', at: atMs })

  it('drops what already fired and orders the rest', () => {
    expect(unfired([r('b', 2), r('a', 1), r('c', 3)], { b: 100 }).map((x) => x.key)).toEqual(['a', 'c'])
  })

  it('forgets what fired long ago', () => {
    const now = Date.now()
    const kept = saveFired({ old: now - FIRED_KEEP_MS - 1, recent: now - 1000 }, now)
    expect(Object.keys(kept)).toEqual(['recent'])
  })
})
