import type { FocusMode, FocusSession, NewEntity } from '@/types/domain'
import { useFocusStore as useSessionStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import { useFocusStore } from '../store/focusStore'
import { creditTask } from './attribution'
import { hasElapsed, nextStep } from './cycle'
import { requestNotificationPermission } from './notifications'
import { remainingNow, workedSeconds } from './time'

/**
 * Everything that changes the timer, as plain functions over the store.
 *
 * None of this is tied to a component, so the page, the mini timer and the keyboard all call the
 * same code, and a block can finish while the person is on a different page.
 */

const store = useFocusStore

/** A block that ended this long ago is stale news: no chime, no notification, no celebration. */
const FRESH_MS = 60_000
const CELEBRATE_MS = 1400
let celebrateTimer = 0

export interface FinishedBlock {
  mode: FocusMode
  /** False when the block ended while nobody was looking, such as after a reload. */
  fresh: boolean
}

/**
 * Writes down the block that is under way, if any time was worked.
 * `at` is the instant it stopped, which for a block that ran out is its deadline, not the moment
 * somebody noticed.
 */
function recordBlock(at: number, completed: boolean): NewEntity<FocusSession> | null {
  const s = store.getState()
  if (!s.started || s.startedAt === null) return null
  const actualSeconds = workedSeconds(s.plannedSeconds, remainingNow(s, at))
  if (actualSeconds <= 0) return null

  const draft: NewEntity<FocusSession> = {
    mode: s.mode,
    taskId: s.taskId,
    projectId: s.projectId,
    plannedSeconds: s.plannedSeconds,
    actualSeconds,
    startedAt: new Date(s.startedAt).toISOString(),
    endedAt: new Date(at).toISOString(),
    completed,
  }
  useSessionStore
    .getState()
    .add(draft)
    .catch(() => useUiStore.getState().showToast('Sesi fokus belum bisa disimpan.'))
  return draft
}

/**
 * Ends the running block if its deadline has passed. Safe to call as often as you like: it only
 * acts while a block is running and over, and it acts once, because it stops the block first.
 */
export function finishBlock(now: number): FinishedBlock | null {
  const s = store.getState()
  if (!s.running || s.endsAt === null || !hasElapsed(s.endsAt, now)) return null

  const endedAt = s.endsAt
  const mode = s.mode
  const taskId = s.taskId
  const draft = recordBlock(endedAt, true)
  const step = nextStep(mode, s.cycle, s.settings.longEvery)
  s.advance(step.mode, step.cycle, s.settings)

  // Focus blocks earn credit on a task; breaks are not work.
  if (mode === 'focus' && draft) creditTask(taskId, draft.actualSeconds, new Date(endedAt))
  if (s.settings.autoStart) store.getState().start(now)

  const fresh = now - endedAt < FRESH_MS
  if (fresh) celebrate()
  return { mode, fresh }
}

function celebrate(): void {
  store.setState({ celebrating: true })
  window.clearTimeout(celebrateTimer)
  celebrateTimer = window.setTimeout(() => store.setState({ celebrating: false }), CELEBRATE_MS)
}

export function startPause(): void {
  const now = Date.now()
  const s = store.getState()
  // Only the first Start of a block asks, so the prompt is always tied to a deliberate click.
  if (!s.started && s.settings.notifications) requestNotificationPermission()
  if (s.running) s.pause(now)
  else s.resume(now)
}

/** Stop early. What was worked is still recorded, marked as not completed. */
export function reset(): void {
  const s = store.getState()
  recordBlock(Date.now(), false)
  s.arm(s.mode, s.settings)
}

/** Jump to the next block. The time so far is recorded as a partial session. */
export function skip(): void {
  const s = store.getState()
  recordBlock(Date.now(), false)
  const step = nextStep(s.mode, s.cycle, s.settings.longEvery)
  s.moveTo(step.mode, step.cycle, s.settings)
}

/** Switching mode abandons a block under way, so it is recorded before it disappears. */
export function selectMode(mode: FocusMode): void {
  const s = store.getState()
  recordBlock(Date.now(), false)
  s.moveTo(mode, s.cycle, s.settings)
}
