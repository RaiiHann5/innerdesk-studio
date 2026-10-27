import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FocusMode, FocusSettings } from '@/types/domain'
import { DEFAULT_FOCUS_SETTINGS, endsAtFrom, plannedSeconds } from '../lib/time'

/**
 * The run state of the timer.
 *
 * Nothing here is a countdown. A running block stores the instant it ends; a paused block stores
 * what was left. That is what makes a reload, a route change or a sleeping laptop a non-event:
 * the store is rebuilt from two numbers rather than replayed from a counter.
 */
export interface FocusRunState {
  mode: FocusMode
  /** Epoch ms. Null when the block is paused or nothing has started. */
  endsAt: number | null
  /** Only meaningful while paused. */
  pausedRemainingMs: number | null
  /** Epoch ms of the moment this block began, or null before the first start. */
  startedAt: number | null
  /** Focus sessions completed since the last long break. */
  cycle: number
  /** Duration this block was started with, which may differ from the current setting. */
  plannedSeconds: number
  taskId?: string
  projectId?: string
}

interface FocusStore extends FocusRunState {
  settings: FocusSettings
  /** True while a block is counting down. */
  running: boolean
  /** True once a block has been started and not yet reset, running or not. */
  started: boolean
  /** True for a moment after a block ends. Not persisted: a reload should not replay it. */
  celebrating: boolean
  start: (now: number, taskId?: string, projectId?: string) => void
  pause: (now: number) => void
  resume: (now: number) => void
  /** Starts the block fresh with its full length. Used by reset and by mode switches. */
  arm: (mode: FocusMode, settings: FocusSettings) => void
  /** Moves to the next block in the cycle without crediting a completed session. */
  moveTo: (mode: FocusMode, cycle: number, settings: FocusSettings) => void
  advance: (mode: FocusMode, cycle: number, settings: FocusSettings) => void
  setTask: (taskId?: string, projectId?: string) => void
  updateSettings: (patch: Partial<FocusSettings>) => void
}

const idle = (settings: FocusSettings): FocusRunState => ({
  mode: 'focus',
  endsAt: null,
  pausedRemainingMs: null,
  startedAt: null,
  cycle: 0,
  plannedSeconds: plannedSeconds(settings, 'focus'),
})

export const useFocusStore = create<FocusStore>()(
  persist(
    (set, get) => ({
      ...idle(DEFAULT_FOCUS_SETTINGS),
      settings: DEFAULT_FOCUS_SETTINGS,
      running: false,
      started: false,
      celebrating: false,

      start(now, taskId, projectId) {
        const { settings, mode, plannedSeconds: planned } = get()
        set({
          running: true,
          started: true,
          endsAt: endsAtFrom(planned, now),
          pausedRemainingMs: null,
          startedAt: now,
          mode,
          plannedSeconds: planned,
          taskId: taskId ?? get().taskId,
          projectId: projectId ?? get().projectId,
          settings,
        })
      },

      pause(now) {
        const { endsAt } = get()
        if (endsAt === null) return
        set({ running: false, endsAt: null, pausedRemainingMs: Math.max(0, endsAt - now) })
      },

      resume(now) {
        const { pausedRemainingMs, startedAt } = get()
        if (pausedRemainingMs === null || pausedRemainingMs <= 0) {
          get().start(now)
          return
        }
        // A block resumed from a pause keeps the length and the start it was originally given.
        set({ running: true, endsAt: now + pausedRemainingMs, pausedRemainingMs: null, startedAt: startedAt ?? now })
      },

      arm(mode, settings) {
        set({ ...idle(settings), mode, plannedSeconds: plannedSeconds(settings, mode), running: false, started: false, settings })
      },

      moveTo(mode, cycle, settings) {
        set({
          mode,
          cycle,
          plannedSeconds: plannedSeconds(settings, mode),
          endsAt: null,
          pausedRemainingMs: null,
          startedAt: null,
          running: false,
          started: false,
          taskId: undefined,
          projectId: undefined,
        })
      },

      advance(mode, cycle, settings) {
        set({
          mode,
          cycle,
          plannedSeconds: plannedSeconds(settings, mode),
          endsAt: null,
          pausedRemainingMs: null,
          startedAt: null,
          running: false,
          started: false,
        })
      },

      setTask(taskId, projectId) {
        set({ taskId, projectId })
      },

      updateSettings(patch) {
        const settings = { ...get().settings, ...patch }
        set({ settings })
        // A block already under way keeps its own length; only an idle block follows the setting.
        if (!get().started) set({ plannedSeconds: plannedSeconds(settings, get().mode) })
      },
    }),
    {
      name: 'pos:focus',
      // Settings and run state are both worth keeping; nothing here is derived.
      partialize: (s) => ({
        mode: s.mode,
        endsAt: s.endsAt,
        pausedRemainingMs: s.pausedRemainingMs,
        startedAt: s.startedAt,
        cycle: s.cycle,
        plannedSeconds: s.plannedSeconds,
        taskId: s.taskId,
        projectId: s.projectId,
        settings: s.settings,
        running: s.running,
        started: s.started,
      }),
      version: 1,
    },
  ),
)