import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MoodEntry, SeedEntity } from '@/types/domain'
import { createLocalDayRepo } from './createLocalDayRepo'

const memory = new Map<string, string>()

beforeEach(() => {
  memory.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
  })
})

const seed = (): SeedEntity<MoodEntry>[] => [
  { date: '2026-10-08', level: 3, factors: [] },
  { date: '2026-10-09', level: 4, factors: ['tidur'] },
]

const makeRepo = () => {
  let n = 0
  return createLocalDayRepo<MoodEntry>({ key: 'test', seed, makeId: () => `m-${++n}` })
}

describe('day repo', () => {
  it('finds a record by its date', async () => {
    const repo = makeRepo()
    expect((await repo.getByDate('2026-10-09'))?.level).toBe(4)
    expect(await repo.getByDate('2026-10-01')).toBeNull()
  })

  it('creates a record for a new day', async () => {
    const repo = makeRepo()
    const saved = await repo.upsert({ date: '2026-10-10', level: 5, factors: ['olahraga'] })
    expect(saved.level).toBe(5)
    expect(await repo.list()).toHaveLength(3)
  })

  it('updates in place when the day already has a record', async () => {
    const repo = makeRepo()
    const before = await repo.getByDate('2026-10-09')
    const saved = await repo.upsert({ date: '2026-10-09', level: 2, factors: [], note: 'Berubah pikiran' })
    expect(saved.id).toBe(before?.id)
    expect(saved.level).toBe(2)
    expect(await repo.list()).toHaveLength(2)
  })

  it('keeps one record per day when saves overlap', async () => {
    const repo = makeRepo()
    await Promise.all([
      repo.upsert({ date: '2026-10-10', level: 3, factors: [] }),
      repo.upsert({ date: '2026-10-10', level: 4, factors: [] }),
    ])
    const forDay = (await repo.list()).filter((e) => e.date === '2026-10-10')
    expect(forDay).toHaveLength(1)
    expect(forDay[0].level).toBe(4)
  })

  it('treats create as an upsert so the generic store cannot add a duplicate day', async () => {
    const repo = makeRepo()
    await repo.create({ date: '2026-10-08', level: 1, factors: [] })
    expect((await repo.list()).filter((e) => e.date === '2026-10-08')).toHaveLength(1)
  })

  it('lists an inclusive date range', async () => {
    const repo = makeRepo()
    expect(await repo.listRange('2026-10-09', '2026-10-09')).toHaveLength(1)
    expect(await repo.listRange('2026-10-01', '2026-10-31')).toHaveLength(2)
    expect(await repo.listRange('2026-11-01', '2026-11-30')).toHaveLength(0)
  })
})
