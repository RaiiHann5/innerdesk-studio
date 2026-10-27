// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_PREFIX } from '@/lib/config'
import { makeProject } from '@/lib/testing'
import { useNoteStore, useProjectStore, useTaskStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { BrainstormSession, Idea } from '@/types/domain'
import {
  addClusterTo,
  addIdeaTo,
  captureIdea,
  convertIdea,
  deleteClusterWithUndo,
  deleteIdeaWithUndo,
  deleteSessionWithUndo,
  moveIdeaTo,
  rateIdea,
} from './actions'
import { useBrainstormStore } from './store/brainstormStore'

const idea = (id: string, extra: Partial<Idea> = {}): Idea => ({ id, text: `Ide ${id}`, starred: false, createdAt: '2026-10-01T00:00:00.000Z', ...extra })
const session = (extra: Partial<BrainstormSession> = {}): BrainstormSession => ({
  id: 'bsm-1',
  title: 'Sesi uji',
  ideas: [],
  clusters: [],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...extra,
})

/** Writes the given sessions as the stored data and loads every store the actions touch. */
async function load(sessions: BrainstormSession[], projects = [makeProject({ id: 'p1', name: 'Innerdesk' })]) {
  localStorage.setItem(STORAGE_PREFIX + 'brainstorm', JSON.stringify(sessions))
  localStorage.setItem(STORAGE_PREFIX + 'tasks', '[]')
  localStorage.setItem(STORAGE_PREFIX + 'notes-v2', '[]')
  localStorage.setItem(STORAGE_PREFIX + 'projects', JSON.stringify(projects))
  await Promise.all([useBrainstormStore.getState().load(), useTaskStore.getState().load(), useNoteStore.getState().load(), useProjectStore.getState().load()])
}
const current = (id = 'bsm-1') => useBrainstormStore.getState().items.find((s) => s.id === id) as BrainstormSession
const runToastAction = () => useUiStore.getState().toast?.action?.run()
const stored = (): BrainstormSession[] => JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'brainstorm') ?? '[]')

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  localStorage.clear()
  useBrainstormStore.setState({ items: [], status: 'idle', error: null })
  useUiStore.setState({ toast: null })
})

describe('captureIdea', () => {
  it('saves into the inbox before the brainstorm page has ever loaded', async () => {
    expect(await captureIdea('  Ide dari palet  ')).toBe(true)
    expect(useBrainstormStore.getState().status).toBe('idle')
    await useBrainstormStore.getState().load()
    const inbox = useBrainstormStore.getState().items.find((s) => s.inbox)
    expect(inbox?.ideas.map((i) => i.text)).toEqual(['Ide dari palet'])
  })

  it('mirrors into a store that is already loaded', async () => {
    await load([session({ id: 'inbox', inbox: true, title: 'Inbox Ide' })])
    await captureIdea('Satu')
    await captureIdea('Dua')
    expect(current('inbox').ideas.map((i) => i.text)).toEqual(['Satu', 'Dua'])
  })

  it('creates the inbox again when it is missing, and ignores blank text', async () => {
    localStorage.setItem(STORAGE_PREFIX + 'brainstorm', JSON.stringify([session()]))
    expect(await captureIdea('   ')).toBe(false)
    await captureIdea('Ide')
    expect(stored().filter((s) => s.inbox)).toHaveLength(1)
    expect(stored().find((s) => s.inbox)?.ideas).toHaveLength(1)
  })
})

describe('editing a session', () => {
  it('keeps two edits made back to back', async () => {
    await load([session()])
    await Promise.all([addIdeaTo('bsm-1', 'Satu'), addIdeaTo('bsm-1', 'Dua')])
    await addClusterTo('bsm-1', 'Fitur')
    expect(current().ideas.map((i) => i.text)).toEqual(['Satu', 'Dua'])
    expect(current().clusters.map((c) => c.name)).toEqual(['Fitur'])
  })

  it('does nothing for a blank idea or a repeated cluster name', async () => {
    await load([session()])
    await addIdeaTo('bsm-1', '  ')
    await addClusterTo('bsm-1', 'Fitur')
    await addClusterTo('bsm-1', 'fitur')
    expect(current().ideas).toHaveLength(0)
    expect(current().clusters).toHaveLength(1)
  })

  it('undoes a deleted idea at its old position', async () => {
    await load([session({ ideas: [idea('a'), idea('b'), idea('c')] })])
    await deleteIdeaWithUndo('bsm-1', current().ideas[1])
    expect(current().ideas.map((i) => i.id)).toEqual(['a', 'c'])
    runToastAction()
    await vi.waitFor(() => expect(current().ideas.map((i) => i.id)).toEqual(['a', 'b', 'c']))
  })

  it('sends the ideas of a deleted cluster back to the tray, and the undo returns them', async () => {
    await load([session({ clusters: [{ id: 'g1', name: 'A', color: 'teal' }], ideas: [idea('a', { clusterId: 'g1' }), idea('b')] })])
    await deleteClusterWithUndo('bsm-1', current().clusters[0])
    expect(current().clusters).toHaveLength(0)
    expect(current().ideas.map((i) => i.clusterId)).toEqual([undefined, undefined])
    runToastAction()
    await vi.waitFor(() => expect(current().clusters.map((c) => c.id)).toEqual(['g1']))
    expect(current().ideas.map((i) => i.clusterId)).toEqual(['g1', undefined])
  })

  it('moves an idea to a cluster and back to the tray', async () => {
    await load([session({ clusters: [{ id: 'g1', name: 'A', color: 'teal' }], ideas: [idea('a')] })])
    await moveIdeaTo('bsm-1', 'a', 'g1')
    expect(current().ideas[0].clusterId).toBe('g1')
    await moveIdeaTo('bsm-1', 'a', undefined)
    expect(current().ideas[0].clusterId).toBeUndefined()
  })

  it('brings a deleted session back with its ideas', async () => {
    await load([session({ ideas: [idea('a')] })])
    await deleteSessionWithUndo(current())
    expect(useBrainstormStore.getState().items).toHaveLength(0)
    runToastAction()
    await vi.waitFor(() => expect(current().ideas).toHaveLength(1))
  })
})

describe('convertIdea', () => {
  it('creates a task in the linked project and links the idea to it', async () => {
    await load([session({ projectId: 'p1', ideas: [idea('a', { text: 'Bikin halaman statistik' })] })])
    await convertIdea('bsm-1', 'a', 'task')
    const task = useTaskStore.getState().items[0]
    expect(task).toMatchObject({ title: 'Bikin halaman statistik', status: 'todo', projectId: 'p1' })
    expect(current().ideas[0].convertedTo).toEqual({ kind: 'task', id: task.id })
    expect(useUiStore.getState().toast?.message).toContain(task.id)
  })

  it('does not make a second copy, even when called twice at once', async () => {
    await load([session({ ideas: [idea('a')] })])
    await Promise.all([convertIdea('bsm-1', 'a', 'task'), convertIdea('bsm-1', 'a', 'note')])
    await convertIdea('bsm-1', 'a', 'project')
    expect(useTaskStore.getState().items.length + useNoteStore.getState().items.length + useProjectStore.getState().items.length - 1).toBe(1)
  })

  it('creates a note whose body keeps the whole text when the title had to be cut', async () => {
    const text = `${'kata '.repeat(40)}akhir`
    await load([session({ ideas: [idea('a', { text })] })])
    await convertIdea('bsm-1', 'a', 'note')
    const note = useNoteStore.getState().items[0]
    expect(note.title.endsWith('…')).toBe(true)
    expect(note.content.content[0].content?.[0].text).toBe(text.trim().replace(/\s+/g, ' '))
  })

  it('creates a project in the riset phase', async () => {
    await load([session({ ideas: [idea('a', { text: 'Aplikasi baru' })] })])
    await convertIdea('bsm-1', 'a', 'project')
    const created = useProjectStore.getState().items.find((p) => p.name === 'Aplikasi baru')
    expect(created).toMatchObject({ status: 'active', phase: 'riset' })
    expect(current().ideas[0].convertedTo).toEqual({ kind: 'project', id: created?.id })
  })

  it('ignores a project link that no longer exists', async () => {
    await load([session({ projectId: 'gone', ideas: [idea('a')] })])
    await convertIdea('bsm-1', 'a', 'task')
    expect(useTaskStore.getState().items[0].projectId).toBeUndefined()
  })

  it('undo removes what was created and clears the link', async () => {
    await load([session({ ideas: [idea('a')] })])
    await convertIdea('bsm-1', 'a', 'task')
    runToastAction()
    await vi.waitFor(() => expect(current().ideas[0].convertedTo).toBeUndefined())
    expect(useTaskStore.getState().items).toHaveLength(0)
  })

  it('lets an idea be converted again once the task it became was deleted', async () => {
    await load([session({ ideas: [idea('a')] })])
    await convertIdea('bsm-1', 'a', 'task')
    await useTaskStore.getState().remove(useTaskStore.getState().items[0].id)
    await convertIdea('bsm-1', 'a', 'task')
    expect(useTaskStore.getState().items).toHaveLength(1)
  })
})

describe('rateIdea', () => {
  it('sets, replaces and clears one axis, and saves it', async () => {
    await load([session({ ideas: [idea('a')] })])
    await rateIdea('bsm-1', 'a', 'impact', 3)
    await rateIdea('bsm-1', 'a', 'effort', 1)
    expect(current().ideas[0]).toMatchObject({ impact: 3, effort: 1 })
    await rateIdea('bsm-1', 'a', 'impact', 2)
    expect(current().ideas[0].impact).toBe(2)
    await rateIdea('bsm-1', 'a', 'effort', undefined)
    expect(current().ideas[0].effort).toBeUndefined()
    expect(stored()[0].ideas[0]).toMatchObject({ impact: 2 })
  })

  it('writes nothing for the score an idea already has, or an idea that is gone', async () => {
    await load([session({ ideas: [idea('a', { impact: 2 })] })])
    const before = localStorage.getItem(STORAGE_PREFIX + 'brainstorm')
    await rateIdea('bsm-1', 'a', 'impact', 2)
    await rateIdea('bsm-1', 'nope', 'impact', 1)
    await rateIdea('bsm-1', 'a', 'effort', undefined)
    expect(localStorage.getItem(STORAGE_PREFIX + 'brainstorm')).toBe(before)
  })

  it('keeps two ratings made back to back', async () => {
    await load([session({ ideas: [idea('a'), idea('b')] })])
    await Promise.all([rateIdea('bsm-1', 'a', 'impact', 3), rateIdea('bsm-1', 'b', 'effort', 2)])
    expect(current().ideas.map((i) => [i.impact, i.effort])).toEqual([
      [3, undefined],
      [undefined, 2],
    ])
  })

  it('leaves the rest of the idea alone', async () => {
    await load([session({ ideas: [idea('a', { starred: true, clusterId: 'g1' })] })])
    await rateIdea('bsm-1', 'a', 'impact', 1)
    expect(current().ideas[0]).toMatchObject({ starred: true, clusterId: 'g1', impact: 1 })
  })
})
