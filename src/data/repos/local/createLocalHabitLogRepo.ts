import type { NewEntity, HabitLog } from '@/types/domain'
import type { HabitLogRepo } from '../interfaces'
import { createLocalRepo } from './createLocalRepo'

type Options = Parameters<typeof createLocalRepo<HabitLog>>[0]

/**
 * localStorage implementation of the habit log repo: one record per (habitId, date), layered on the generic local repo.
 * `create` behaves like `upsert`, so the one-per-day rule cannot be bypassed through the generic store.
 */
export function createLocalHabitLogRepo(options: Options): HabitLogRepo {
  const base = createLocalRepo<HabitLog>(options)
  // Writes are chained so two quick taps on the same habit and day cannot both decide to create.
  let queue: Promise<unknown> = Promise.resolve()
  const serialized = <R>(task: () => Promise<R>): Promise<R> => {
    const run = queue.then(task, task)
    queue = run.catch(() => undefined)
    return run
  }

  const upsert = (input: NewEntity<HabitLog>) =>
    serialized(async () => {
      const existing = (await base.list()).find((log) => log.habitId === input.habitId && log.date === input.date)
      return existing ? base.update(existing.id, input) : base.create(input)
    })

  return {
    ...base,
    create: upsert,
    upsert,
    async listRange(from, to) {
      return (await base.list()).filter((log) => log.date >= from && log.date <= to)
    },
    removeForHabit: (habitId) =>
      serialized(async () => {
        const doomed = (await base.list()).filter((log) => log.habitId === habitId)
        for (const log of doomed) await base.remove(log.id)
        return doomed
      }),
  }
}
