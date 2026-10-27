import type { Entity, NewEntity } from '@/types/domain'
import type { DayRepo } from '../interfaces'
import { createLocalRepo } from './createLocalRepo'

type Options<T extends Entity & { date: string }> = Parameters<typeof createLocalRepo<T>>[0]

/** localStorage implementation of a one-record-per-day repo, layered on the generic local repo. */
export function createLocalDayRepo<T extends Entity & { date: string }>(options: Options<T>): DayRepo<T> {
  const base = createLocalRepo<T>(options)
  // Writes are chained so two quick saves for the same day cannot both decide to create.
  let queue: Promise<unknown> = Promise.resolve()
  const serialized = <R>(task: () => Promise<R>): Promise<R> => {
    const run = queue.then(task, task)
    queue = run.catch(() => undefined)
    return run
  }

  const getByDate = async (date: string) => (await base.list()).find((item) => item.date === date) ?? null

  const upsert = (input: NewEntity<T>) =>
    serialized(async () => {
      const existing = await getByDate(input.date)
      return existing ? base.update(existing.id, input) : base.create(input)
    })

  return {
    ...base,
    getByDate,
    upsert,
    create: upsert,
    async listRange(from, to) {
      return (await base.list()).filter((item) => item.date >= from && item.date <= to)
    },
  }
}
