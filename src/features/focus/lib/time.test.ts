import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FOCUS_SETTINGS,
  endsAtFrom,
  formatClock,
  formatDuration,
  plannedSeconds,
  progress,
  remainingMs,
  remainingNow,
  workedSeconds,
} from './time'

const settings = { ...DEFAULT_FOCUS_SETTINGS, focusMin: 25, shortMin: 5, longMin: 15 }

describe('plannedSeconds', () => {
  it('reads each mode from its own setting', () => {
    expect(plannedSeconds(settings, 'focus')).toBe(1500)
    expect(plannedSeconds(settings, 'short')).toBe(300)
    expect(plannedSeconds(settings, 'long')).toBe(900)
  })

  it('never returns a zero-length block', () => {
    expect(plannedSeconds({ ...settings, focusMin: 0 }, 'focus')).toBe(60)
    expect(plannedSeconds({ ...settings, focusMin: -5 }, 'focus')).toBe(60)
  })

  it('follows a changed setting', () => {
    expect(plannedSeconds({ ...settings, focusMin: 50 }, 'focus')).toBe(3000)
  })
})

describe('remainingMs', () => {
  const start = 1_000_000

  it('is the difference between two instants', () => {
    expect(remainingMs(endsAtFrom(25, start), start)).toBe(25_000)
  })

  it('falls as the clock moves, with no counting involved', () => {
    const endsAt = endsAtFrom(25, start)
    expect(remainingMs(endsAt, start)).toBe(25_000)
    expect(remainingMs(endsAt, start + 10_000)).toBe(15_000)
    expect(remainingMs(endsAt, start + 24_999)).toBe(1)
  })

  it('is zero once the block is over, never negative', () => {
    expect(remainingMs(endsAtFrom(1, start), start + 60_000)).toBe(0)
  })

  it('is zero when nothing is scheduled', () => {
    expect(remainingMs(null, start)).toBe(0)
  })

  it('does not drift when ticks are missed', () => {
    // A 25 minute block, with the tab asleep for a minute: two ticks, and the answer is still exact.
    const endsAt = endsAtFrom(1500, start)
    expect(remainingMs(endsAt, start + 60_000)).toBe(1500_000 - 60_000)
    expect(remainingMs(endsAt, start + 60_000 + 250)).toBe(1500_000 - 60_000 - 250)
  })
})

describe('formatClock', () => {
  it('shows mm:ss under an hour', () => {
    expect(formatClock(24 * 60_000 + 12_000)).toBe('24:12')
    expect(formatClock(5 * 60_000)).toBe('05:00')
    expect(formatClock(59_000)).toBe('00:59')
  })

  it('adds an hour part only when there is one', () => {
    expect(formatClock(60 * 60_000)).toBe('1:00:00')
    expect(formatClock(3661_000)).toBe('1:01:01')
  })

  it('rounds up, so a block shows its last second rather than zero early', () => {
    expect(formatClock(1)).toBe('00:01')
    expect(formatClock(1001)).toBe('00:02')
  })

  it('reads zero once the block is over', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(-5000)).toBe('00:00')
  })
})

describe('progress', () => {
  it('runs from empty to full', () => {
    expect(progress(1500_000, 1500)).toBe(0)
    expect(progress(750_000, 1500)).toBe(0.5)
    expect(progress(0, 1500)).toBe(1)
  })

  it('is clamped when the clock is past the end or a length is missing', () => {
    expect(progress(-1000, 1500)).toBe(1)
    expect(progress(100, 0)).toBe(1)
  })
})

describe('remainingNow', () => {
  const base = { plannedSeconds: 1500, endsAt: null, pausedRemainingMs: null }

  it('counts down from the deadline while running', () => {
    expect(remainingNow({ ...base, running: true, endsAt: 10_000 }, 4_000)).toBe(6_000)
  })

  it('returns what was left at the pause while paused, whatever the clock says', () => {
    expect(remainingNow({ ...base, running: false, pausedRemainingMs: 600_000 }, 99_999_999)).toBe(600_000)
  })

  it('falls back to the full block when nothing has started', () => {
    expect(remainingNow({ ...base, running: false }, 0)).toBe(1_500_000)
  })
})

describe('workedSeconds', () => {
  it('is the block minus what is left', () => {
    expect(workedSeconds(1500, 600_000)).toBe(900)
  })

  it('is the whole block once nothing is left', () => {
    expect(workedSeconds(1500, 0)).toBe(1500)
  })

  it('never goes below zero or above the block', () => {
    expect(workedSeconds(1500, 2_000_000)).toBe(0)
    expect(workedSeconds(1500, -5_000)).toBe(1500)
  })
})

describe('formatDuration', () => {
  it('drops the parts that are zero', () => {
    expect(formatDuration(3600)).toBe('1 jam')
    expect(formatDuration(4500)).toBe('1 jam 15 menit')
    expect(formatDuration(900)).toBe('15 menit')
  })

  it('handles sub-minute totals', () => {
    expect(formatDuration(30)).toBe('30 detik')
    expect(formatDuration(0)).toBe('0 detik')
  })
})