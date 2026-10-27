import { vi } from 'vitest'
import { STORAGE_PREFIX } from '@/lib/config'
import { useNoteStore, useProjectStore, useTaskStore } from '@/stores/entities'
import type { Note, Project, Task } from '@/types/domain'

/** Test-only helpers for the project screens. They write to jsdom's localStorage and load the real stores. */
export function stubBrowser() {
  // jsdom does not implement the modal methods of <dialog>; open/close is all the tests need.
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & { showModal?: () => void }
  proto.showModal = function (this: HTMLDialogElement) {
    this.open = true
  }
  proto.close = function (this: HTMLDialogElement) {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }))
  localStorage.clear()
}

export const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'note-1',
  title: 'Catatan contoh',
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
  excerpt: 'Isi singkat',
  tags: [],
  pinned: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

export async function seed({ projects = [], tasks = [], notes = [] }: { projects?: Project[]; tasks?: Task[]; notes?: Note[] }) {
  localStorage.setItem(STORAGE_PREFIX + 'projects', JSON.stringify(projects))
  localStorage.setItem(STORAGE_PREFIX + 'tasks', JSON.stringify(tasks))
  localStorage.setItem(STORAGE_PREFIX + 'notes-v2', JSON.stringify(notes))
  await Promise.all([useProjectStore.getState().load(), useTaskStore.getState().load(), useNoteStore.getState().load()])
}

export const projectById = (id: string) => useProjectStore.getState().items.find((p) => p.id === id) as Project
