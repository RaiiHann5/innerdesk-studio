import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFocusStore as useSessionStore } from '@/stores/entities'
import { useFocusStore } from '../store/focusStore'
import { finishBlock, reset, selectMode, skip, startPause } from './timerActions'
import { DEFAULT_FOCUS_SETTINGS } from './time'

const T0 = Date.UTC(2026, 9, 10, 3, 0, 0)
const MIN = 60_000
const settings = { ...DEFAULT_FOCUS_SETTINGS, notifications: false }
const at = (ms: number) => vi.setSystemTime(T0 + ms)
const sessions = () => useSessionStore.getState().items

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('window', globalThis)
  at(0)
  useFocusStore.getState().arm('focus', settings)
  useFocusStore.setState({ celebrating: false })
  useSessionStore.setState({ items: [] })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('stopping a block early', () => {
  it('records the time on the clock, not the time on the wall', () => {
    startPause()
    at(5 * MIN)
    startPause() // pause with 20 minutes left
    at(125 * MIN) // an hour and a half later
    reset()

    expect(sessions()).toHaveLength(1)
    expect(sessions()[0]).toMatchObject({ mode: 'focus', actualSeconds: 300, plannedSeconds: 1500, completed: false })
  })

  it('records nothing for a block that never ran', () => {
    reset()
    skip()
    selectMode('long')
    expect(sessions()).toHaveLength(0)
  })

  it('counts a skip as a partial block and moves on', () => {
    startPause()
    at(10 * MIN)
    skip()

    expect(sessions()[0]).toMatchObject({ actualSeconds: 600, completed: false })
    expect(useFocusStore.getState()).toMatchObject({ mode: 'short', started: false, running: false })
  })
})

describe('finishing a block', () => {
  it('does nothing before the deadline', () => {
    startPause()
    at(24 * MIN)
    expect(finishBlock(Date.now())).toBeNull()
    expect(sessions()).toHaveLength(0)
  })

  it('records the whole block, moves to a break and says it is fresh', () => {
    startPause()
    at(25 * MIN + 400)
    const done = finishBlock(Date.now())

    expect(done).toEqual({ mode: 'focus', fresh: true })
    expect(sessions()[0]).toMatchObject({ actualSeconds: 1500, completed: true })
    expect(useFocusStore.getState()).toMatchObject({ mode: 'short', cycle: 1, running: false, celebrating: true })
  })

  it('ends a block once, however often it is asked', () => {
    startPause()
    at(26 * MIN)
    finishBlock(Date.now())
    expect(finishBlock(Date.now())).toBeNull()
    expect(finishBlock(Date.now())).toBeNull()
    expect(sessions()).toHaveLength(1)
  })

  it('catches up after a reload that lands hours past the deadline, without making a fuss', () => {
    startPause()
    at(5 * 60 * MIN) // the laptop slept through the end
    const done = finishBlock(Date.now())

    expect(done).toEqual({ mode: 'focus', fresh: false })
    expect(useFocusStore.getState().celebrating).toBe(false)
    // The session ends when the block did, not when someone came back.
    expect(sessions()[0]).toMatchObject({ actualSeconds: 1500, endedAt: new Date(T0 + 25 * MIN).toISOString() })
  })

  it('does not finish a paused block, however long it sits', () => {
    startPause()
    at(10 * MIN)
    startPause()
    at(10 * 60 * MIN)
    expect(finishBlock(Date.now())).toBeNull()
  })

  it('takes a long break after every fourth focus block', () => {
    const modes: string[] = []
    for (let i = 0; i < 4; i++) {
      startPause()
      at((i + 1) * 100 * MIN)
      finishBlock(Date.now())
      modes.push(useFocusStore.getState().mode)
      useFocusStore.getState().moveTo('focus', useFocusStore.getState().cycle, settings)
    }
    expect(modes).toEqual(['short', 'short', 'short', 'long'])
  })

  it('rolls into the next block when auto-start is on', () => {
    useFocusStore.getState().updateSettings({ autoStart: true })
    startPause()
    at(25 * MIN)
    finishBlock(Date.now())

    expect(useFocusStore.getState()).toMatchObject({ mode: 'short', running: true, started: true })
  })
})
