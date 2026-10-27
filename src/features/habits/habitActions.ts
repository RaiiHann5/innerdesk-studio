import { habitLogRepo, habitRepo } from '@/data/repos'
import { isComplete } from '@/lib/habits'
import { useHabitLogStore, useHabitStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { Habit, HabitLog } from '@/types/domain'

/** No habit needs more than this in a day; it only keeps a stray tap-and-hold from writing nonsense. */
export const MAX_VALUE = 999

const toast = (message: string, action?: { label: string; run: () => void }) => useUiStore.getState().showToast(message, action)

/** Puts a saved log into the store, replacing the one for the same habit and day. */
const mirrorLog = (saved: HabitLog) =>
  useHabitLogStore.setState((s) => ({ items: [...s.items.filter((l) => !(l.habitId === saved.habitId && l.date === saved.date)), saved] }))

/** What a tap on the check should write: finish a day that is not done, empty one that is. */
export const toggledValue = (habit: Habit, current: number): number => (isComplete(habit, current) ? 0 : habit.target)

/** How far the plus and minus buttons move a counted habit. A long target such as 15 pages would take too many taps otherwise. */
export const stepFor = (habit: Pick<Habit, 'target'>): number => (habit.target >= 100 ? 10 : habit.target >= 30 ? 5 : 1)

/** Current value read from the store at the moment of the call, not from a render that may be a tap behind. */
const valueNow = (habitId: string, date: string): number =>
  useHabitLogStore.getState().items.find((l) => l.habitId === habitId && l.date === date)?.value ?? 0

// Every write waits for the one before it. Two quick taps on "+" then both start from the result of the one before,
// instead of both starting from the same stale number and the second one overwriting the first.
let chain: Promise<unknown> = Promise.resolve()
const inOrder = <R>(task: () => Promise<R>): Promise<R> => {
  const run = chain.then(task, task)
  chain = run.catch(() => undefined)
  return run
}

const logOf = (habitId: string, date: string) => useHabitLogStore.getState().items.find((l) => l.habitId === habitId && l.date === date)

async function removeLog(log: HabitLog) {
  await habitLogRepo.remove(log.id)
  useHabitLogStore.setState((s) => ({ items: s.items.filter((l) => l.id !== log.id) }))
}

async function write(habit: Habit, date: string, value: number): Promise<boolean> {
  const next = Math.max(0, Math.min(MAX_VALUE, Math.round(value)))
  try {
    const existing = logOf(habit.id, date)
    if (next === 0) {
      // Unticking a day must not throw away what was written about it.
      if (existing?.note) mirrorLog(await habitLogRepo.upsert({ habitId: habit.id, date, value: 0 }))
      else if (existing) await removeLog(existing)
    } else {
      mirrorLog(await habitLogRepo.upsert({ habitId: habit.id, date, value: next }))
    }
    return true
  } catch {
    toast('Kebiasaan gagal dicatat. Coba lagi.')
    return false
  }
}

async function writeNote(habit: Habit, date: string, text: string): Promise<boolean> {
  const note = text.trim()
  try {
    const existing = logOf(habit.id, date)
    if (!note) {
      // Nothing written and nothing done leaves no row behind.
      if (existing && existing.value === 0) await removeLog(existing)
      else if (existing) mirrorLog(await habitLogRepo.upsert({ habitId: habit.id, date, value: existing.value, note: undefined }))
    } else {
      mirrorLog(await habitLogRepo.upsert({ habitId: habit.id, date, value: existing?.value ?? 0, note }))
    }
    return true
  } catch {
    toast('Catatan gagal disimpan. Coba lagi.')
    return false
  }
}

/**
 * Sets how much of a habit was done on a day. Zero removes the log, so a day with nothing done has no row.
 * Resolves to whether it was saved; a failure has already been shown to the person.
 */
export const setHabitValue = (habit: Habit, date: string, value: number): Promise<boolean> => inOrder(() => write(habit, date, value))

/** Writes the journal entry for a day. An empty text deletes it. Whatever was ticked that day is left alone. */
export const setHabitNote = (habit: Habit, date: string, text: string): Promise<boolean> => inOrder(() => writeNote(habit, date, text))

/** The plus and minus buttons: moves the day by `delta` from whatever it holds right now. */
export const stepHabit = (habit: Habit, date: string, delta: number): Promise<boolean> => inOrder(() => write(habit, date, valueNow(habit.id, date) + delta))

/** The check button: finishes the day, or empties it if it was already finished. */
export const toggleHabitDay = (habit: Habit, date: string): Promise<boolean> =>
  inOrder(() => write(habit, date, toggledValue(habit, valueNow(habit.id, date))))

/** Hides a habit from the daily list. Its history stays, so restoring brings the streak back as it was. */
export async function archiveHabitWithUndo(habit: Habit): Promise<void> {
  try {
    await useHabitStore.getState().update(habit.id, { archivedAt: new Date().toISOString() })
  } catch {
    return toast('Kebiasaan gagal diarsipkan.')
  }
  toast('Kebiasaan diarsipkan.', { label: 'Urungkan', run: () => void unarchiveHabit(habit) })
}

export async function unarchiveHabit(habit: Habit): Promise<void> {
  try {
    await useHabitStore.getState().update(habit.id, { archivedAt: undefined })
  } catch {
    toast('Kebiasaan gagal dipulihkan.')
  }
}

/** Deletes a habit with its whole history. The undo puts back the habit and every log with their original ids. */
export async function deleteHabitWithUndo(habit: Habit): Promise<void> {
  let removed: HabitLog[]
  try {
    removed = await habitLogRepo.removeForHabit(habit.id)
    await habitRepo.remove(habit.id)
  } catch {
    return toast('Kebiasaan gagal dihapus.')
  }
  useHabitStore.setState((s) => ({ items: s.items.filter((h) => h.id !== habit.id) }))
  useHabitLogStore.setState((s) => ({ items: s.items.filter((l) => l.habitId !== habit.id) }))
  toast('Kebiasaan dihapus.', {
    label: 'Urungkan',
    run: () => {
      void (async () => {
        try {
          const restored = await habitRepo.restore(habit)
          const logs: HabitLog[] = []
          for (const log of removed) logs.push(await habitLogRepo.restore(log))
          useHabitStore.setState((s) => ({ items: [...s.items, restored] }))
          useHabitLogStore.setState((s) => ({ items: [...s.items, ...logs] }))
        } catch {
          toast('Kebiasaan gagal dikembalikan.')
        }
      })()
    },
  })
}

