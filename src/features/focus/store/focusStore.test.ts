import { beforeEach, describe, expect, it } from 'vitest'
import { nextStep } from '../lib/cycle'
import { DEFAULT_FOCUS_SETTINGS } from '../lib/time'
import { useFocusStore } from './focusStore'

const settings = { ...DEFAULT_FOCUS_SETTINGS, focusMin: 25, shortMin: 5, longMin: 15, longEvery: 4 }
const T0 = 1_700_000_000_000

const fresh = () => useFocusStore.setState({ ...useFocusStore.getState(), ...initial(settings) })

const initial = (s = settings) => ({
  mode: 'focus' as const,
  endsAt: null,
  pausedRemainingMs: null,
  startedAt: null,
  cycle: 0,
  plannedSeconds: s.focusMin * 60,
  taskId: undefined,
  projectId: undefined,
  settings: s,
  running: false,
  started: false,
})

const state = () => useFocusStore.getState()

beforeEach(() => fresh())

describe('start and pause', () => {
  it('schedules an absolute end rather than storing a countdown', () => {
    state().start(T0)
    expect(state().endsAt).toBe(T0 + 1500_000)
    expect(state().pausedRemainingMs).toBeNull()
    expect(state().running).toBe(true)
    expect(state().started).toBe(true)
  })

  it('freezes the remainder on pause', () => {
    state().start(T0)
    state().pause(T0 + 600_000)
    expect(state().running).toBe(false)
    expect(state().endsAt).toBeNull()
    expect(state().pausedRemainingMs).toBe(900_000)
  })

  it('ignores a pause when nothing is running', () => {
    state().pause(T0)
    expect(state().pausedRemainingMs).toBeNull()
  })

  it('resumes from the frozen remainder, not from the original length', () => {
    state().start(T0)
    state().pause(T0 + 600_000)
    state().resume(T0 + 900_000)
    expect(state().endsAt).toBe(T0 + 900_000 + 900_000)
    expect(state().pausedRemainingMs).toBeNull()
    expect(state().running).toBe(true)
  })

  it('keeps the original start across a pause, so the session records the real elapsed time', () => {
    state().start(T0)
    state().pause(T0 + 600_000)
    state().resume(T0 + 900_000)
    expect(state().startedAt).toBe(T0)
  })

  it('starts over when resuming with nothing left', () => {
    state().start(T0)
    state().pause(T0 + 1500_000)
    state().resume(T0 + 1600_000)
    expect(state().endsAt).toBe(T0 + 1600_000 + 1500_000)
  })
})

describe('reload mid-session', () => {
  it('restores a running block from the persisted end instant', () => {
    state().start(T0)
    // A reload copies the persisted fields straight back into a fresh store.
    const persisted = {
      mode: state().mode,
      endsAt: state().endsAt,
      pausedRemainingMs: state().pausedRemainingMs,
      startedAt: state().startedAt,
      cycle: state().cycle,
      plannedSeconds: state().plannedSeconds,
      running: state().running,
      started: state().started,
      settings: state().settings,
    }
    fresh()
    useFocusStore.setState(persisted)

    expect(state().endsAt).toBe(T0 + 1500_000)
    expect(state().running).toBe(true)
    // Ten minutes later the remaining time is right, with nothing having been counted.
    expect(Math.max(0, state().endsAt! - (T0 + 600_000))).toBe(900_000)
  })

  it('restores a paused block with its remainder intact', () => {
    state().start(T0)
    state().pause(T0 + 300_000)
    const pausedRemainingMs = state().pausedRemainingMs
    fresh()
    useFocusStore.setState({ pausedRemainingMs, running: false, started: true })
    expect(state().pausedRemainingMs).toBe(pausedRemainingMs)
    expect(state().running).toBe(false)
  })
})

describe('reset and skip', () => {
  it('reset returns the block to its full length, not to zero', () => {
    state().start(T0)
    state().arm('focus', settings)
    expect(state().endsAt).toBeNull()
    expect(state().plannedSeconds).toBe(1500)
    expect(state().started).toBe(false)
  })

  it('skip moves on without crediting a completed session', () => {
    state().start(T0)
    const step = { mode: 'short' as const, cycle: 1 }
    state().moveTo(step.mode, step.cycle, settings)
    expect(state().mode).toBe('short')
    expect(state().cycle).toBe(1)
    expect(state().started).toBe(false)
    expect(state().plannedSeconds).toBe(300)
  })

  it('skip drops the linked task, since the next block is a different piece of work', () => {
    state().setTask('TSK-1', 'prj-1')
    state().start(T0)
    state().moveTo('short', 1, settings)
    expect(state().taskId).toBeUndefined()
    expect(state().projectId).toBeUndefined()
  })

  it('advance keeps the task, because auto-start continues the same piece of work', () => {
    state().setTask('TSK-1', 'prj-1')
    state().start(T0)
    state().advance('short', 1, settings)
    expect(state().taskId).toBe('TSK-1')
  })
})

describe('the long break interval', () => {
  it('lands on a long break after every fourth focus block', () => {
    const breaks = Array.from({ length: 4 }, (_, i) => nextStep('focus', i, 4))
    expect(breaks).toEqual([
      { mode: 'short', cycle: 1 },
      { mode: 'short', cycle: 2 },
      { mode: 'short', cycle: 3 },
      { mode: 'long', cycle: 4 },
    ])
  })
})

describe('settings', () => {
  it('changes the length of an idle block', () => {
    state().updateSettings({ focusMin: 50 })
    expect(state().plannedSeconds).toBe(3000)
  })

  it('leaves a block that is already under way alone', () => {
    state().start(T0)
    state().updateSettings({ focusMin: 50 })
    expect(state().plannedSeconds).toBe(1500)
    expect(state().endsAt).toBe(T0 + 1500_000)
  })
})