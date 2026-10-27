import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Note } from '@/types/domain'

const update = vi.fn()
vi.mock('@/data/repos', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/repos')>()
  return { ...actual, noteRepo: { ...actual.noteRepo, update: (...args: unknown[]) => update(...args) } }
})

const { archiveNoteWithUndo, togglePin, unarchiveNote } = await import('./actions')
const { useNoteStore } = await import('@/stores/entities')
const { useUiStore } = await import('@/stores/ui')

const note: Note = {
  id: 'n1',
  title: 'Rapat',
  content: { type: 'doc', content: [] },
  excerpt: '',
  tags: [],
  pinned: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

beforeEach(() => {
  update.mockReset()
  update.mockImplementation(async (_id: string, patch: Partial<Note>) => ({ ...note, ...patch }))
  useNoteStore.setState({ items: [note] })
  useUiStore.setState({ toast: null } as never)
})

describe('archiveNoteWithUndo', () => {
  it('sets archivedAt, keeps the pin and offers an undo', async () => {
    await archiveNoteWithUndo(note)
    const patch = update.mock.calls[0][1]
    expect(typeof patch.archivedAt).toBe('string')
    expect(patch).not.toHaveProperty('pinned')
    expect(useNoteStore.getState().items[0].archivedAt).toBe(patch.archivedAt)
    expect(useUiStore.getState().toast?.message).toBe('Catatan diarsipkan.')
  })

  it('undo clears archivedAt again', async () => {
    await archiveNoteWithUndo(note)
    useUiStore.getState().toast?.action?.run()
    await vi.waitFor(() => expect(useNoteStore.getState().items[0].archivedAt).toBeUndefined())
  })

  it('reports a failed save without a stale undo', async () => {
    update.mockRejectedValueOnce(new Error('x'))
    await archiveNoteWithUndo(note)
    expect(useUiStore.getState().toast?.message).toBe('Catatan gagal diarsipkan.')
    expect(useUiStore.getState().toast?.action).toBeUndefined()
  })
})

describe('unarchiveNote and togglePin', () => {
  it('restores a note from the archive', async () => {
    await unarchiveNote({ ...note, archivedAt: '2026-10-05T00:00:00.000Z' })
    expect(update).toHaveBeenCalledWith('n1', { archivedAt: undefined })
  })

  it('flips the pin', async () => {
    await togglePin(note)
    expect(update).toHaveBeenCalledWith('n1', { pinned: false })
  })
})
