import { STORAGE_PREFIX } from '@/lib/config'
import { readJSON, writeJSON } from '@/lib/storage'
import type { Entity, NewEntity, SeedEntity } from '@/types/domain'
import type { Repo } from '../interfaces'

interface Options<T extends Entity> {
  key: string
  seed: () => SeedEntity<T>[]
  makeId: (existing: T[]) => string
  /** Fills defaults for fields that older stored data lacks. Applied on every read, never written back by itself. */
  normalize?: (items: T[]) => T[]
}

const uid = () => Math.random().toString(36).slice(2, 10)
export const randomId = (prefix: string) => (): string => `${prefix}-${uid()}`

export function createLocalRepo<T extends Entity>({ key, seed, makeId, normalize = (items) => items }: Options<T>): Repo<T> {
  const storageKey = STORAGE_PREFIX + key

  const read = (): T[] => {
    const stored = readJSON<T[]>(storageKey)
    if (stored) return normalize(stored)
    const base = Date.now()
    const items: T[] = []
    for (const draft of seed()) {
      const { id, createdAt, updatedAt, ...rest } = draft
      // Stagger timestamps so "recent" lists look natural instead of all sharing one instant.
      const stamp = new Date(base - (items.length + 1) * 53 * 60_000).toISOString()
      items.push({
        ...rest,
        id: id ?? makeId(items),
        createdAt: createdAt ?? stamp,
        updatedAt: updatedAt ?? createdAt ?? stamp,
      } as unknown as T)
    }
    const normalized = normalize(items)
    writeJSON(storageKey, normalized)
    return normalized
  }

  return {
    async list() {
      return read()
    },
    async get(id) {
      return read().find((item) => item.id === id) ?? null
    },
    async create(input: NewEntity<T>) {
      const items = read()
      const now = new Date().toISOString()
      const item = { ...input, id: makeId(items), createdAt: now, updatedAt: now } as unknown as T
      writeJSON(storageKey, [...items, item])
      return item
    },
    async update(id, patch) {
      const items = read()
      const index = items.findIndex((item) => item.id === id)
      if (index === -1) throw new Error('Data tidak ditemukan.')
      const next = { ...items[index], ...patch, updatedAt: new Date().toISOString() } as T
      items[index] = next
      writeJSON(storageKey, items)
      return next
    },
    async restore(item) {
      const items = read()
      if (items.some((existing) => existing.id === item.id)) throw new Error('Data sudah ada.')
      writeJSON(storageKey, [...items, item])
      return item
    },
    async remove(id) {
      writeJSON(
        storageKey,
        read().filter((item) => item.id !== id),
      )
    },
  }
}
