import { beforeEach, describe, expect, it, vi } from 'vitest'
import { habitLogRepo, habitRepo, libraryItemRepo, libraryLogRepo, libraryQuoteRepo, projectRepo, taskRepo } from '@/data/repos'
import { isScheduled } from '@/lib/habits'
import { EMPTY_FILTERS, filterTasks } from '@/lib/taskQuery'

const memory = new Map<string, string>()

beforeEach(() => {
  memory.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
  })
})

describe('seed data', () => {
  it('gives every task and project the complete current shape', async () => {
    const [tasks, projects] = await Promise.all([taskRepo.list(), projectRepo.list()])
    for (const t of tasks) {
      expect(Array.isArray(t.subtasks)).toBe(true)
      expect(Number.isFinite(t.order)).toBe(true)
    }
    for (const p of projects) {
      expect(p.color).toBeTruthy()
      expect(Array.isArray(p.milestones)).toBe(true)
      expect(Array.isArray(p.links)).toBe(true)
    }
  })

  it('points every task at a project that exists', async () => {
    const [tasks, projects] = await Promise.all([taskRepo.list(), projectRepo.list()])
    const ids = new Set(projects.map((p) => p.id))
    for (const t of tasks) if (t.projectId) expect(ids.has(t.projectId)).toBe(true)
  })

  it('uses unique ids, including subtasks, milestones and links', async () => {
    const [tasks, projects] = await Promise.all([taskRepo.list(), projectRepo.list()])
    const unique = (list: string[]) => expect(new Set(list).size).toBe(list.length)
    unique(tasks.map((t) => t.id))
    unique(tasks.flatMap((t) => t.subtasks.map((s) => s.id)))
    unique(projects.flatMap((p) => p.milestones.map((m) => m.id)))
    unique(projects.flatMap((p) => p.links.map((l) => l.id)))
  })

  it('orders each status column without ties', async () => {
    const tasks = await taskRepo.list()
    for (const status of ['todo', 'doing', 'review', 'done'] as const) {
      const orders = tasks.filter((t) => t.status === status).map((t) => t.order)
      expect(new Set(orders).size).toBe(orders.length)
    }
  })

  it('shows the new fields in use: subtasks, an estimate, a recurring task and an archived one that stays hidden', async () => {
    const tasks = await taskRepo.list()
    expect(tasks.some((t) => t.subtasks.length > 0)).toBe(true)
    expect(tasks.some((t) => t.estimateMinutes)).toBe(true)
    expect(tasks.some((t) => t.recurrence)).toBe(true)
    const archived = tasks.filter((t) => t.archivedAt)
    expect(archived.length).toBeGreaterThan(0)
    const shown = filterTasks(tasks, EMPTY_FILTERS)
    for (const a of archived) expect(shown.some((t) => t.id === a.id)).toBe(false)
  })

  it('keeps subtask counts consistent: never more done than total', async () => {
    for (const t of await taskRepo.list()) expect(t.subtasks.filter((s) => s.done).length).toBeLessThanOrEqual(t.subtasks.length)
  })
})

describe('habit seed data', () => {
  it('points every log at a habit that exists, on a day the habit is due', async () => {
    const [habits, logs] = await Promise.all([habitRepo.list(), habitLogRepo.list()])
    const byId = new Map(habits.map((h) => [h.id, h]))
    expect(logs.length).toBeGreaterThan(0)
    for (const log of logs) {
      const habit = byId.get(log.habitId)
      expect(habit).toBeDefined()
      expect(isScheduled(habit!, log.date)).toBe(true)
      // A day with nothing done is only stored when something was written about it.
      if (log.value === 0) expect(log.note).toBeTruthy()
      else expect(log.value).toBeGreaterThan(0)
    }
  })

  it('keeps one log per habit per day', async () => {
    const logs = await habitLogRepo.list()
    const keys = logs.map((l) => `${l.habitId}|${l.date}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('gives every habit a complete shape and its own place in the order', async () => {
    const habits = await habitRepo.list()
    for (const h of habits) {
      expect(h.days.length).toBeGreaterThan(0)
      expect(h.target).toBeGreaterThanOrEqual(1)
    }
    const orders = habits.map((h) => h.order)
    expect(new Set(orders).size).toBe(orders.length)
  })
})

describe('library seed data', () => {
  it('has films and books, each with what its kind needs', async () => {
    const items = await libraryItemRepo.list()
    expect(items.some((i) => i.kind === 'film')).toBe(true)
    expect(items.some((i) => i.kind === 'buku')).toBe(true)
    for (const item of items) {
      expect(item.title.trim()).not.toBe('')
      if (item.rating !== undefined) expect(Number.isInteger(item.rating) && item.rating >= 1 && item.rating <= 10).toBe(true)
      if (item.kind === 'buku') {
        expect(item.authors?.length).toBeGreaterThan(0)
        expect(item.pages).toBeGreaterThan(0)
        expect(item.currentPage ?? 0).toBeLessThanOrEqual(item.pages as number)
      } else {
        expect(item.director).toBeTruthy()
      }
    }
  })

  it('stores no pictures and no links to pictures', async () => {
    for (const item of await libraryItemRepo.list()) expect(item.coverUrl).toBeUndefined()
  })

  it('has a finish date exactly on the finished items', async () => {
    for (const item of await libraryItemRepo.list()) expect(Boolean(item.finishedAt)).toBe(item.status === 'done')
  })

  it('has a book in progress that is not on its last page', async () => {
    const reading = (await libraryItemRepo.list()).filter((i) => i.kind === 'buku' && i.status === 'active')
    expect(reading.length).toBeGreaterThan(0)
    for (const book of reading) expect(book.currentPage ?? 0).toBeLessThan(book.pages as number)
  })

  it('points every log and quote at an item of the right kind', async () => {
    const [items, logs, quotes] = await Promise.all([libraryItemRepo.list(), libraryLogRepo.list(), libraryQuoteRepo.list()])
    const byId = new Map(items.map((i) => [i.id, i]))
    for (const log of logs) {
      const item = byId.get(log.itemId)
      expect(item).toBeDefined()
      if (item?.kind === 'buku') expect(log.toPage ?? 0).toBeGreaterThanOrEqual(log.fromPage ?? 0)
    }
    for (const quote of quotes) expect(byId.has(quote.itemId)).toBe(true)
  })

  it('gives the example from the brief: Oppenheimer with its cast', async () => {
    const film = (await libraryItemRepo.list()).find((i) => i.title === 'Oppenheimer')
    expect(film?.cast?.map((c) => c.name)).toContain('Cillian Murphy')
    expect(film?.rating).toBeDefined()
    expect(film?.review).toBeDefined()
  })
})

