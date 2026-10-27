import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HabitLog, SeedEntity } from '@/types/domain'
import { createLocalHabitLogRepo } from './createLocalHabitLogRepo'
import { randomId } from './createLocalRepo'

const memory = new Map<string, string>()

beforeEach(() => {
  memory.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
  })
})

const make = (seed: () => SeedEntity<HabitLog>[] = () => []) => createLocalHabitLogRepo({ key: 'habit-logs-test', seed, makeId: randomId('hlog') })

describe('createLocalHabitLogRepo', () => {
  it('updates the log for a habit and day instead of adding a second one', async () => {
    const repo = make()
    const first = await repo.upsert({ habitId: 'h1', date: '2026-10-25', value: 1 })
    const second = await repo.upsert({ habitId: 'h1', date: '2026-10-25', value: 4 })
    expect(second.id).toBe(first.id)
    expect(await repo.list()).toHaveLength(1)
    expect((await repo.get(first.id))?.value).toBe(4)
  })

  it('keeps different habits and different days apart', async () => {
    const repo = make()
    await repo.upsert({ habitId: 'h1', date: '2026-10-25', value: 1 })
    await repo.upsert({ habitId: 'h2', date: '2026-10-25', value: 1 })
    await repo.upsert({ habitId: 'h1', date: '2026-10-24', value: 1 })
    expect(await repo.list()).toHaveLength(3)
  })

  it('does not let two quick writes for the same day create two rows', async () => {
    const repo = make()
    await Promise.all([1, 2, 3, 4, 5].map((value) => repo.upsert({ habitId: 'h1', date: '2026-10-25', value })))
    expect(await repo.list()).toHaveLength(1)
  })

  it('treats create like upsert, so the rule cannot be bypassed', async () => {
    const repo = make()
    await repo.create({ habitId: 'h1', date: '2026-10-25', value: 1 })
    await repo.create({ habitId: 'h1', date: '2026-10-25', value: 2 })
    expect(await repo.list()).toHaveLength(1)
  })

  it('lists a range inclusively', async () => {
    const repo = make()
    for (const date of ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']) await repo.upsert({ habitId: 'h1', date, value: 1 })
    expect((await repo.listRange('2026-10-02', '2026-10-03')).map((l) => l.date)).toEqual(['2026-10-02', '2026-10-03'])
  })

  it('removes every log of one habit and hands them back for undo', async () => {
    const repo = make()
    await repo.upsert({ habitId: 'h1', date: '2026-10-01', value: 1 })
    await repo.upsert({ habitId: 'h1', date: '2026-10-02', value: 1 })
    await repo.upsert({ habitId: 'h2', date: '2026-10-01', value: 1 })
    const removed = await repo.removeForHabit('h1')
    expect(removed).toHaveLength(2)
    expect((await repo.list()).map((l) => l.habitId)).toEqual(['h2'])
    await repo.restore(removed[0])
    expect(await repo.list()).toHaveLength(2)
    expect(await repo.removeForHabit('nope')).toEqual([])
  })

  it('keeps the note when only the value changes, and drops it when the note is cleared', async () => {
    const repo = make()
    await repo.upsert({ habitId: 'h1', date: '2026-10-25', value: 1, note: 'Lancar' })
    const changed = await repo.upsert({ habitId: 'h1', date: '2026-10-25', value: 0 })
    expect(changed).toMatchObject({ value: 0, note: 'Lancar' })
    const cleared = await repo.upsert({ habitId: 'h1', date: '2026-10-25', value: 0, note: undefined })
    expect(cleared.note).toBeUndefined()
    expect((await repo.list())[0].note).toBeUndefined()
  })
})
