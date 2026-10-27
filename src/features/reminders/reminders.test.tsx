// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_PREFIX } from '@/lib/config'
import { ALL_WEEKDAYS } from '@/lib/habits'
import { useEventStore, useHabitLogStore, useHabitStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { CalendarEvent, Habit } from '@/types/domain'
import { deliverReminder } from './deliver'
import { ReminderRuntime } from './ReminderRuntime'
import { GRACE_MS, reminderTick } from './tick'

const local = (d: string, h: number, m = 0) => new Date(`${d}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`)

const event: CalendarEvent = {
  id: 'e1',
  createdAt: '',
  updatedAt: '',
  title: 'Rapat klien',
  start: local('2026-10-26', 10).toISOString(),
  end: local('2026-10-26', 11).toISOString(),
  allDay: false,
  categoryId: 'c',
  reminders: [10],
}

const habit: Habit = {
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
}

describe('reminderTick', () => {
  const base = { events: [event], habits: [], logs: [], fired: {} }
  const due = local('2026-10-26', 9, 50).getTime()

  it('returns a reminder that became due since the last tick', () => {
    const result = reminderTick({ ...base, now: due + 5_000, last: due - 10_000 })
    expect(result.map((r) => r.key)).toEqual([`event|e1|10`])
  })

  it('catches up on a reminder from a minute before the first tick, but not from an hour before', () => {
    expect(reminderTick({ ...base, now: due + 60_000, last: null })).toHaveLength(1)
    expect(reminderTick({ ...base, now: due + GRACE_MS + 60_000, last: null })).toHaveLength(0)
  })

  it('does not go back further than the grace period after a long sleep', () => {
    expect(reminderTick({ ...base, now: due + 3 * 60 * 60_000, last: due - 60_000 })).toHaveLength(0)
  })

  it('does not return what has already fired', () => {
    const fired = { 'event|e1|10': due }
    expect(reminderTick({ ...base, fired, now: due + 5_000, last: null })).toHaveLength(0)
  })

  it('includes habit reminders', () => {
    const at = local('2026-10-25', 20).getTime()
    const result = reminderTick({ events: [], habits: [habit], logs: [], fired: {}, now: at + 1_000, last: at - 1_000 })
    expect(result.map((r) => r.key)).toEqual(['habit|h1|2026-10-25'])
  })
})

describe('deliverReminder', () => {
  const reminder = { key: 'k', title: 'Rapat klien', body: '10 menit lagi', at: 0 }
  beforeEach(() => useUiStore.setState({ toast: null }))
  afterEach(() => vi.unstubAllGlobals())

  function stubNotification(permission: NotificationPermission, throws = false) {
    const made: Array<{ title: string; options: NotificationOptions }> = []
    class Fake {
      static permission = permission
      constructor(title: string, options: NotificationOptions) {
        if (throws) throw new TypeError('Illegal constructor')
        made.push({ title, options })
      }
    }
    vi.stubGlobal('Notification', Fake)
    return made
  }

  it('sends a system notification when allowed, tagged so the same reminder replaces itself', () => {
    const made = stubNotification('granted')
    expect(deliverReminder(reminder)).toBe('system')
    expect(made).toEqual([{ title: 'Rapat klien', options: { body: '10 menit lagi', tag: 'k' } }])
    expect(useUiStore.getState().toast).toBeNull()
  })

  it('falls back to the in-app toast when permission is denied or never given', () => {
    for (const permission of ['denied', 'default'] as const) {
      useUiStore.setState({ toast: null })
      const made = stubNotification(permission)
      expect(deliverReminder(reminder)).toBe('toast')
      expect(made).toHaveLength(0)
      expect(useUiStore.getState().toast?.message).toBe('Rapat klien: 10 menit lagi')
    }
  })

  it('falls back to the toast when the browser refuses the constructor', () => {
    stubNotification('granted', true)
    expect(deliverReminder(reminder)).toBe('toast')
    expect(useUiStore.getState().toast?.message).toContain('Rapat klien')
  })

  it('still works in a browser with no Notification API at all', () => {
    vi.stubGlobal('Notification', undefined)
    expect(deliverReminder(reminder)).toBe('toast')
  })
})

describe('ReminderRuntime', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(local('2026-10-26', 9, 49))
    vi.stubGlobal('Notification', undefined)
    useUiStore.setState({ toast: null })
    useHabitStore.setState({ items: [], status: 'ready' })
    useHabitLogStore.setState({ items: [], status: 'ready' })
    useEventStore.setState({ items: [event], status: 'ready' })
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('fires a reminder once when its time comes, and not again on later ticks', () => {
    render(<ReminderRuntime />)
    expect(useUiStore.getState().toast).toBeNull()

    act(() => void vi.advanceTimersByTime(30_000)) // 09:49:30, not yet
    expect(useUiStore.getState().toast).toBeNull()

    act(() => void vi.advanceTimersByTime(30_000)) // 09:50:00
    const first = useUiStore.getState().toast
    expect(first?.message).toContain('Rapat klien')

    useUiStore.setState({ toast: null })
    act(() => void vi.advanceTimersByTime(5 * 60_000))
    expect(useUiStore.getState().toast).toBeNull()
  })

  it('remembers what fired, so a reload a minute later does not repeat it', () => {
    const first = render(<ReminderRuntime />)
    act(() => void vi.advanceTimersByTime(60_000))
    expect(useUiStore.getState().toast).not.toBeNull()
    expect(Object.keys(JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'reminders-fired') ?? '{}'))).toEqual(['event|e1|10'])
    first.unmount()

    useUiStore.setState({ toast: null })
    act(() => void vi.advanceTimersByTime(30_000))
    render(<ReminderRuntime />)
    expect(useUiStore.getState().toast).toBeNull()
  })

  it('catches up on a reminder that came due a minute before the app opened', () => {
    vi.setSystemTime(local('2026-10-26', 9, 51))
    render(<ReminderRuntime />)
    expect(useUiStore.getState().toast?.message).toContain('Rapat klien')
  })

  it('waits for the data instead of treating an unloaded store as empty', () => {
    useEventStore.setState({ status: 'loading', items: [] })
    vi.setSystemTime(local('2026-10-26', 9, 50))
    render(<ReminderRuntime />)
    act(() => void vi.advanceTimersByTime(15_000))
    useEventStore.setState({ status: 'ready', items: [event] })
    act(() => void vi.advanceTimersByTime(15_000))
    expect(useUiStore.getState().toast?.message).toContain('Rapat klien')
  })

  it('stops ticking when unmounted', () => {
    const view = render(<ReminderRuntime />)
    view.unmount()
    act(() => void vi.advanceTimersByTime(2 * 60_000))
    expect(useUiStore.getState().toast).toBeNull()
  })
})
