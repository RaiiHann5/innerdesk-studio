import { describe, expect, it } from 'vitest'
import { addDays, setHours, setMinutes, startOfDay } from 'date-fns'
import { makeEvent } from '../lib/testing'
import type { EventDraft } from './eventDraft'
import {
  blankDraft,
  draftFromEvent,
  ensureAllDayEnd,
  isSameDraft,
  minutesBetween,
  moveStart,
  toEventInput,
  validate,
} from './eventDraft'

const day = (n: number, h = 0, min = 0) => new Date(2026, 9, n, h, min)
const day10 = day(10)

describe('blankDraft', () => {
  it('starts at 09:00 and runs one hour', () => {
    const draft = blankDraft(day10, 'cat-kerja')
    expect(draft.startTime).toBe('09:00')
    expect(draft.endTime).toBe('10:00')
    expect(draft.date).toBe('2026-10-10')
  })

  it('covers exactly one day when turned into an all-day event', () => {
    const draft = ensureAllDayEnd({ ...blankDraft(day10, 'cat-kerja'), allDay: true })
    expect(draft.endDate).toBe('2026-10-11')
  })
})

describe('moveStart', () => {
  it('keeps the duration when the start moves', () => {
    const draft = blankDraft(day10, 'cat-kerja')
    const moved = moveStart(draft, '14:15')
    expect(moved.startTime).toBe('14:15')
    expect(minutesBetween(moved.startTime, moved.endTime)).toBe(60)
  })

  it('falls back to one hour when the draft had an impossible range', () => {
    const draft = { ...blankDraft(day10, 'cat-kerja'), startTime: '15:00', endTime: '14:00' }
    expect(moveStart(draft, '09:00').endTime).toBe('10:00')
  })
})

describe('ensureAllDayEnd', () => {
  it('pushes an end that is not after the start to the next day', () => {
    const draft = { ...blankDraft(day10, 'cat-kerja'), endDate: '2026-10-10' }
    expect(ensureAllDayEnd(draft).endDate).toBe('2026-10-11')
  })

  it('leaves a valid exclusive end alone', () => {
    const draft = { ...blankDraft(day10, 'cat-kerja'), endDate: '2026-10-14' }
    expect(ensureAllDayEnd(draft).endDate).toBe('2026-10-14')
  })
})

describe('draftFromEvent', () => {
  it('reads a timed event as it was written', () => {
    const event = makeEvent({ start: day(10, 13, 30), end: day(10, 16), location: 'Kantor' })
    const draft = draftFromEvent(event)
    expect(draft.startTime).toBe('13:30')
    expect(draft.endTime).toBe('16:00')
    expect(draft.location).toBe('Kantor')
  })

  it('slides a repeat onto the clicked occurrence, keeping time of day and length', () => {
    const event = makeEvent({
      start: day(1, 6),
      end: day(1, 7),
      recurrence: { freq: 'weekly', exceptions: [] },
    })
    const draft = draftFromEvent(event, day(8, 0).toISOString())
    expect(draft.date).toBe('2026-10-08')
    expect(draft.startTime).toBe('06:00')
    expect(draft.endTime).toBe('07:00')
    expect(draft.repeat).toBe('weekly')
  })

  it('keeps the number of days of a multi-day all-day event', () => {
    const event = makeEvent({ allDay: true, start: startOfDay(day(12)), end: startOfDay(addDays(day(12), 3)) })
    const draft = draftFromEvent(event, startOfDay(day(19)).toISOString())
    expect(draft.date).toBe('2026-10-19')
    expect(draft.endDate).toBe('2026-10-22')
    expect(draft.allDay).toBe(true)
  })
})

describe('validate', () => {
  it('asks for a title', () => {
    expect(validate(blankDraft(day10, 'cat-kerja')).title).toBeDefined()
  })

  it('accepts a complete draft', () => {
    const draft = { ...blankDraft(day10, 'cat-kerja'), title: ' Review desain ' }
    expect(validate(draft)).toEqual({})
  })

  it('rejects an end before the start', () => {
    const draft = { ...blankDraft(day10, 'cat-kerja'), title: 'Uji', startTime: '15:00', endTime: '14:00' }
    expect(validate(draft).time).toBeDefined()
  })

  it('rejects an all-day end that is not after the start', () => {
    const draft = { ...blankDraft(day10, 'cat-kerja'), title: 'Uji', allDay: true, endDate: '2026-10-10' }
    expect(validate(draft).time).toBeDefined()
  })
})

describe('toEventInput', () => {
  it('turns a draft into repo fields and drops empty optionals', () => {
    const draft = { ...blankDraft(day10, 'cat-kerja'), title: '  Bimbingan  ', location: '  ' }
    const fields = toEventInput(draft)
    expect(fields.title).toBe('Bimbingan')
    expect(fields.location).toBeUndefined()
    expect(fields.projectId).toBeUndefined()
    expect(fields.allDay).toBe(false)
    expect(new Date(fields.start).getHours()).toBe(9)
  })

  it('writes all-day boundaries as local midnight', () => {
    const draft = { ...blankDraft(day10, 'cat-kerja'), title: 'Perjalanan', allDay: true, endDate: '2026-10-13' }
    const fields = toEventInput(draft)
    expect(new Date(fields.start).getHours()).toBe(0)
    expect(new Date(fields.end).getDate()).toBe(13)
  })

  it('clears the rule when repeat goes back to none', () => {
    const event = makeEvent({ start: day(1, 6), end: day(1, 7), recurrence: { freq: 'weekly', exceptions: ['2026-10-01'] } })
    const draft = { ...draftFromEvent(event), repeat: 'none' as const }
    expect(toEventInput(draft, event).recurrence).toBeUndefined()
  })

  it('keeps existing exceptions when the frequency changes', () => {
    const event = makeEvent({ start: day(1, 6), end: day(1, 7), recurrence: { freq: 'weekly', exceptions: ['2026-10-01'] } })
    const fields = toEventInput({ ...draftFromEvent(event), repeat: 'monthly' }, event)
    expect(fields.recurrence).toEqual({ freq: 'monthly', exceptions: ['2026-10-01'] })
  })
})

describe('isSameDraft', () => {
  const draft: EventDraft = { ...blankDraft(day10, 'cat-kerja'), title: 'Sesi fokus', reminders: [10, 60] }

  it('sees an untouched draft as unchanged', () => {
    expect(isSameDraft(draft, { ...draft })).toBe(true)
  })

  it('sees a changed field', () => {
    expect(isSameDraft(draft, { ...draft, title: 'Sesi lain' })).toBe(false)
  })

  it('sees a reordered reminder list', () => {
    expect(isSameDraft(draft, { ...draft, reminders: [60, 10] })).toBe(false)
  })
})

describe('time boundaries', () => {
  it('keeps seconds and milliseconds out of the editor fields', () => {
    const start = setMinutes(setHours(startOfDay(day(10)), 8), 5)
    expect(draftFromEvent(makeEvent({ start, end: setMinutes(start, 45) })).startTime).toBe('08:05')
  })
})