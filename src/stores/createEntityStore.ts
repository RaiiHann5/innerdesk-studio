import { create } from 'zustand'
import type { Repo } from '@/data/repos/interfaces'
import type { Entity, NewEntity } from '@/types/domain'

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface EntityState<T extends Entity> {
  items: T[]
  status: LoadStatus
  error: string | null
  load: () => Promise<void>
  add: (input: NewEntity<T>) => Promise<T>
  update: (id: string, patch: Partial<NewEntity<T>>) => Promise<void>
  remove: (id: string) => Promise<void>
}

const messageOf = (e: unknown) => (e instanceof Error ? e.message : 'Terjadi kesalahan yang tidak diketahui.')

/** Placeholder id for the optimistic copy, swapped for the real one as soon as the repo answers. */
const tempId = () => `tmp-${Math.random().toString(36).slice(2, 10)}`

export function createEntityStore<T extends Entity>(repo: Repo<T>) {
  return create<EntityState<T>>((set, get) => ({
    items: [],
    status: 'idle',
    error: null,
    async load() {
      set({ status: 'loading', error: null })
      try {
        set({ items: await repo.list(), status: 'ready' })
      } catch (e) {
        set({ status: 'error', error: messageOf(e) })
      }
    },
    async add(input) {
      const previous = get().items
      const now = new Date().toISOString()
      const optimistic = { ...input, id: tempId(), createdAt: now, updatedAt: now } as unknown as T
      set({ items: [...previous, optimistic] })
      try {
        const item = await repo.create(input)
        set((s) => ({ items: s.items.map((i) => (i.id === optimistic.id ? item : i)) }))
        return item
      } catch (e) {
        set({ items: previous })
        throw e
      }
    },
    async update(id, patch) {
      const previous = get().items
      set({ items: previous.map((i) => (i.id === id ? ({ ...i, ...patch } as T) : i)) })
      try {
        const saved = await repo.update(id, patch)
        set((s) => ({ items: s.items.map((i) => (i.id === id ? saved : i)) }))
      } catch (e) {
        set({ items: previous })
        throw e
      }
    },
    async remove(id) {
      const previous = get().items
      set({ items: previous.filter((i) => i.id !== id) })
      try {
        await repo.remove(id)
      } catch (e) {
        set({ items: previous })
        throw e
      }
    },
  }))
}
