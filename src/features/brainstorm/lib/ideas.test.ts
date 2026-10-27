import { describe, expect, it } from 'vitest'
import type { Idea, IdeaCluster } from '@/types/domain'
import {
  CLUSTER_COLORS,
  MAX_IDEA_LENGTH,
  addCluster,
  addIdea,
  clusterNameTaken,
  groupIdeas,
  isProcessed,
  moveIdea,
  recolorCluster,
  removeCluster,
  removeIdea,
  restoreCluster,
  restoreIdea,
  renameCluster,
  renameIdea,
  setConversion,
  splitTitle,
  starredFirst,
  toggleStar,
} from './ideas'

const idea = (id: string, extra: Partial<Idea> = {}): Idea => ({ id, text: `Ide ${id}`, starred: false, createdAt: '2026-10-01T00:00:00.000Z', ...extra })
const cluster = (id: string, name: string, color: IdeaCluster['color'] = 'teal'): IdeaCluster => ({ id, name, color })

describe('ideas', () => {
  it('adds at the end, trims, and ignores blank text', () => {
    const list = [idea('a')]
    const next = addIdea(list, '  Baru  ', undefined, 'b', '2026-10-02T00:00:00.000Z')
    expect(next.at(-1)).toEqual({ id: 'b', text: 'Baru', clusterId: undefined, starred: false, createdAt: '2026-10-02T00:00:00.000Z' })
    expect(addIdea(list, '   ')).toEqual(list)
    expect(list).toHaveLength(1)
  })

  it('cuts text at the limit', () => {
    expect(addIdea([], 'x'.repeat(MAX_IDEA_LENGTH + 50))[0].text).toHaveLength(MAX_IDEA_LENGTH)
  })

  it('renames, and keeps the old text when the new one is blank', () => {
    expect(renameIdea([idea('a')], 'a', ' Lain ')[0].text).toBe('Lain')
    expect(renameIdea([idea('a')], 'a', '  ')[0].text).toBe('Ide a')
  })

  it('removes, stars and moves without mutating', () => {
    const list = [idea('a'), idea('b')]
    expect(removeIdea(list, 'a').map((i) => i.id)).toEqual(['b'])
    expect(toggleStar(list, 'b')[1].starred).toBe(true)
    expect(moveIdea(list, 'a', 'g1')[0].clusterId).toBe('g1')
    expect(moveIdea([idea('a', { clusterId: 'g1' })], 'a', undefined)[0].clusterId).toBeUndefined()
    expect(list[1].starred).toBe(false)
  })

  it('records and clears a conversion', () => {
    const converted = setConversion([idea('a')], 'a', { kind: 'task', id: 'TSK-1' })
    expect(converted[0].convertedTo).toEqual({ kind: 'task', id: 'TSK-1' })
    expect(setConversion(converted, 'a', undefined)[0].convertedTo).toBeUndefined()
  })
})

describe('clusters', () => {
  it('hands out colours in turn and wraps after the last', () => {
    let list: IdeaCluster[] = []
    for (let i = 0; i < CLUSTER_COLORS.length + 1; i++) list = addCluster(list, `K${i}`, `g${i}`)
    expect(list.map((c) => c.color)).toEqual([...CLUSTER_COLORS, CLUSTER_COLORS[0]])
  })

  it('refuses a blank or repeated name, ignoring case', () => {
    const list = [cluster('g1', 'Fitur')]
    expect(addCluster(list, '  ')).toEqual(list)
    expect(addCluster(list, 'fitur')).toEqual(list)
    expect(clusterNameTaken(list, 'FITUR')).toBe(true)
    expect(clusterNameTaken(list, 'FITUR', 'g1')).toBe(false)
  })

  it('renames, keeping the old name for a blank or taken one', () => {
    const list = [cluster('g1', 'Fitur'), cluster('g2', 'Desain')]
    expect(renameCluster(list, 'g1', ' Produk ')[0].name).toBe('Produk')
    expect(renameCluster(list, 'g1', '')[0].name).toBe('Fitur')
    expect(renameCluster(list, 'g1', 'desain')[0].name).toBe('Fitur')
  })

  it('steps the colour and wraps', () => {
    const last = cluster('g1', 'A', CLUSTER_COLORS[CLUSTER_COLORS.length - 1])
    expect(recolorCluster([cluster('g1', 'A', 'teal')], 'g1')[0].color).toBe(CLUSTER_COLORS[(CLUSTER_COLORS.indexOf('teal') + 1) % CLUSTER_COLORS.length])
    expect(recolorCluster([last], 'g1')[0].color).toBe(CLUSTER_COLORS[0])
  })

  it('returns the ideas of a removed cluster to the tray instead of deleting them', () => {
    const result = removeCluster([cluster('g1', 'A'), cluster('g2', 'B')], [idea('a', { clusterId: 'g1' }), idea('b', { clusterId: 'g2' })], 'g1')
    expect(result.clusters.map((c) => c.id)).toEqual(['g2'])
    expect(result.ideas.map((i) => i.clusterId)).toEqual([undefined, 'g2'])
  })
})

describe('groupIdeas', () => {
  it('splits into the tray and one list per cluster, keeping empty clusters', () => {
    const groups = groupIdeas([idea('a'), idea('b', { clusterId: 'g1' }), idea('c', { clusterId: 'g1' })], [cluster('g1', 'A'), cluster('g2', 'B')])
    expect(groups.tray.map((i) => i.id)).toEqual(['a'])
    expect(groups.byCluster.get('g1')?.map((i) => i.id)).toEqual(['b', 'c'])
    expect(groups.byCluster.get('g2')).toEqual([])
  })

  it('treats an idea pointing at a missing cluster as unclustered', () => {
    expect(groupIdeas([idea('a', { clusterId: 'gone' })], []).tray.map((i) => i.id)).toEqual(['a'])
  })
})

describe('starredFirst', () => {
  it('puts starred ideas first and keeps capture order inside each group', () => {
    const list = [idea('a'), idea('b', { starred: true }), idea('c'), idea('d', { starred: true })]
    expect(starredFirst(list).map((i) => i.id)).toEqual(['b', 'd', 'a', 'c'])
  })
})

describe('isProcessed', () => {
  const targets = { tasks: [{ id: 'TSK-1' }], notes: [{ id: 'note-1' }], projects: [{ id: 'prj-1' }] }
  it('is true only while the task, note or project still exists', () => {
    expect(isProcessed(idea('a', { convertedTo: { kind: 'task', id: 'TSK-1' } }), targets)).toBe(true)
    expect(isProcessed(idea('a', { convertedTo: { kind: 'note', id: 'note-1' } }), targets)).toBe(true)
    expect(isProcessed(idea('a', { convertedTo: { kind: 'project', id: 'prj-1' } }), targets)).toBe(true)
    expect(isProcessed(idea('a', { convertedTo: { kind: 'task', id: 'TSK-9' } }), targets)).toBe(false)
    expect(isProcessed(idea('a'), targets)).toBe(false)
  })
  it('does not match an id of another kind', () => {
    expect(isProcessed(idea('a', { convertedTo: { kind: 'project', id: 'TSK-1' } }), targets)).toBe(false)
  })
})

describe('splitTitle', () => {
  it('keeps a short text whole, with no description', () => {
    expect(splitTitle('  Dashboard   baru ', 40)).toEqual({ title: 'Dashboard baru' })
  })
  it('cuts a long text at a word and keeps the whole of it as the description', () => {
    const text = 'Bikin halaman statistik yang menampilkan fokus mingguan dan mood'
    const result = splitTitle(text, 30)
    expect(result.title.endsWith('…')).toBe(true)
    expect(result.title.length).toBeLessThanOrEqual(31)
    expect(result.description).toBe(text)
  })
})

describe('undo helpers', () => {
  it('puts an idea back where it was, and never twice', () => {
    const list = [idea('a'), idea('c')]
    expect(restoreIdea(list, idea('b'), 1).map((i) => i.id)).toEqual(['a', 'b', 'c'])
    expect(restoreIdea(list, idea('b'), 99).map((i) => i.id)).toEqual(['a', 'c', 'b'])
    expect(restoreIdea(list, idea('a'), 0)).toHaveLength(2)
  })

  it('puts a cluster back with its ideas, leaving ideas that were moved elsewhere alone', () => {
    const { clusters, ideas } = removeCluster([cluster('g1', 'A'), cluster('g2', 'B')], [idea('a', { clusterId: 'g1' }), idea('b', { clusterId: 'g1' })], 'g1')
    const movedAway = moveIdea(ideas, 'b', 'g2')
    const restored = restoreCluster(clusters, movedAway, cluster('g1', 'A'), 0, ['a', 'b'])
    expect(restored.clusters.map((c) => c.id)).toEqual(['g1', 'g2'])
    expect(restored.ideas.map((i) => i.clusterId)).toEqual(['g1', 'g2'])
  })
})
