import type { FocusMode, FocusSettings } from '@/types/domain'

/**
 * All timer arithmetic in one place, and none of it counts ticks.
 *
 * Remaining time is always a difference between two instants, so a throttled tab, a sleeping laptop
 * or a reload cannot make the clock drift: the next read simply recomputes from the wall clock.
 */

export const DEFAULT_FOCUS_SETTINGS: FocusSettings = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  longEvery: 4,
  autoStart: false,
  sound: false,
  volume: 0.4,
  notifications: true,
  characterOn: true,
  reduceMotion: false,
}

export const MODE_LABEL: Record<FocusMode, string> = {
  focus: 'Fokus',
  short: 'Istirahat pendek',
  long: 'Istirahat panjang',
}

/** The full length of one block of this mode, in seconds. Never below a minute, so a mistyped setting cannot make a block flash past. */
export const plannedSeconds = (settings: FocusSettings, mode: FocusMode): number => {
  const minutes = mode === 'focus' ? settings.focusMin : mode === 'short' ? settings.shortMin : settings.longMin
  return Math.max(60, Math.round(minutes * 60))
}

/** What is left of a block that ends at `endsAt`. Zero once it is past. */
export const remainingMs = (endsAt: number | null, now: number): number =>
  endsAt === null ? 0 : Math.max(0, endsAt - now)

/** The instant a block of this length started now ends. */
export const endsAtFrom = (seconds: number, now: number): number => now + seconds * 1000

/**
 * Display clock. Under an hour it is `mm:ss`, above it `h:mm:ss`.
 * Negative input is clamped, so a block that overran still reads as zero rather than counting up.
 */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600)
  const pad = (n: number) => String(n).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

/** How far through the block we are, from 0 to 1. Used by the ring. */
export const progress = (remaining: number, plannedSeconds: number): number => {
  if (plannedSeconds <= 0) return 1
  return Math.min(1, Math.max(0, 1 - remaining / (plannedSeconds * 1000)))
}

/** `1 jam 15 menit`, for the one-line summary. Anything under a minute stays in seconds rather than rounding up to a minute. */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds))
  if (safe < 60) return `${safe} detik`
  const minutes = Math.round(safe / 60)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const parts = [hours > 0 ? `${hours} jam` : null, rest > 0 ? `${rest} menit` : null].filter(Boolean)
  return parts.join(' ')
}

/** What is left of a block right now, whether it is counting down or paused. */
export const remainingNow = (
  block: { running: boolean; endsAt: number | null; pausedRemainingMs: number | null; plannedSeconds: number },
  now: number,
): number =>
  block.running ? remainingMs(block.endsAt, now) : (block.pausedRemainingMs ?? block.plannedSeconds * 1000)

/**
 * Seconds of a block that were really worked: what it was worth minus what is still on the clock.
 *
 * Measuring from the clock rather than from the start time is what keeps a pause honest. Ten
 * minutes spent paused leave the remaining time untouched, so they never turn into worked time.
 */
export const workedSeconds = (planned: number, remaining: number): number =>
  Math.min(planned, Math.max(0, Math.round(planned - remaining / 1000)))

/** Below this, focus mode switches the character to its last-minute pose. */
export const LAST_MINUTE_MS = 60_000