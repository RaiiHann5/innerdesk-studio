import type { CategoryColor, Idea, IdeaCluster, IdeaConversion, Note, Project, Task } from '@/types/domain'

/** Handed out in this order, so neighbouring clusters never share a colour until the sixth one. */
export const CLUSTER_COLORS: CategoryColor[] = ['teal', 'ochre', 'moss', 'clay', 'rosewood', 'slate']

export const MAX_IDEA_LENGTH = 280
export const MAX_CLUSTER_NAME_LENGTH = 40

const rand = () => Math.random().toString(36).slice(2, 10)
export const newIdeaId = (): string => `idea-${rand()}`
export const newClusterId = (): string => `grp-${rand()}`

/** Adds an idea at the end. A blank text adds nothing and returns an equal list. Longer text is cut at the limit. */
export function addIdea(list: readonly Idea[], text: string, clusterId?: string, id: string = newIdeaId(), now: string = new Date().toISOString()): Idea[] {
  const clean = text.trim().slice(0, MAX_IDEA_LENGTH)
  return clean ? [...list, { id, text: clean, clusterId, starred: false, createdAt: now }] : [...list]
}

/** Renames one. A blank text keeps the old one: emptying the field is not a way to delete. */
export function renameIdea(list: readonly Idea[], id: string, text: string): Idea[] {
  const clean = text.trim().slice(0, MAX_IDEA_LENGTH)
  return clean ? list.map((i) => (i.id === id ? { ...i, text: clean } : i)) : [...list]
}

export const removeIdea = (list: readonly Idea[], id: string): Idea[] => list.filter((i) => i.id !== id)

/** Puts a removed idea back at the position it had (undo). An index past the end appends. */
export function restoreIdea(list: readonly Idea[], idea: Idea, index: number): Idea[] {
  if (list.some((i) => i.id === idea.id)) return [...list]
  const at = Math.max(0, Math.min(index, list.length))
  return [...list.slice(0, at), idea, ...list.slice(at)]
}

export const toggleStar = (list: readonly Idea[], id: string): Idea[] => list.map((i) => (i.id === id ? { ...i, starred: !i.starred } : i))

/** Puts an idea in a cluster, or back in the tray when `clusterId` is undefined. */
export const moveIdea = (list: readonly Idea[], id: string, clusterId: string | undefined): Idea[] =>
  list.map((i) => (i.id === id ? { ...i, clusterId } : i))

/** Records what the idea became, or clears it (undo). */
export const setConversion = (list: readonly Idea[], id: string, convertedTo: IdeaConversion | undefined): Idea[] =>
  list.map((i) => (i.id === id ? { ...i, convertedTo } : i))

const sameName = (a: string, b: string) => a.trim().toLocaleLowerCase('id') === b.trim().toLocaleLowerCase('id')

/** True when another cluster already uses the name. Case does not matter, so "Fitur" and "fitur" count as one. */
export const clusterNameTaken = (clusters: readonly IdeaCluster[], name: string, exceptId?: string): boolean =>
  clusters.some((c) => c.id !== exceptId && sameName(c.name, name))

/** Adds a cluster with the next colour in turn. A blank or repeated name adds nothing. */
export function addCluster(clusters: readonly IdeaCluster[], name: string, id: string = newClusterId()): IdeaCluster[] {
  const clean = name.trim().slice(0, MAX_CLUSTER_NAME_LENGTH)
  if (!clean || clusterNameTaken(clusters, clean)) return [...clusters]
  return [...clusters, { id, name: clean, color: CLUSTER_COLORS[clusters.length % CLUSTER_COLORS.length] }]
}

/** Renames one. A blank or already used name keeps the old one. */
export function renameCluster(clusters: readonly IdeaCluster[], id: string, name: string): IdeaCluster[] {
  const clean = name.trim().slice(0, MAX_CLUSTER_NAME_LENGTH)
  if (!clean || clusterNameTaken(clusters, clean, id)) return [...clusters]
  return clusters.map((c) => (c.id === id ? { ...c, name: clean } : c))
}

/** Steps a cluster to the next colour. */
export const recolorCluster = (clusters: readonly IdeaCluster[], id: string): IdeaCluster[] =>
  clusters.map((c) => (c.id === id ? { ...c, color: CLUSTER_COLORS[(CLUSTER_COLORS.indexOf(c.color) + 1) % CLUSTER_COLORS.length] } : c))

/** Removes a cluster. Its ideas are not deleted: they go back to the tray. */
export function removeCluster(clusters: readonly IdeaCluster[], ideas: readonly Idea[], id: string): { clusters: IdeaCluster[]; ideas: Idea[] } {
  return {
    clusters: clusters.filter((c) => c.id !== id),
    ideas: ideas.map((i) => (i.clusterId === id ? { ...i, clusterId: undefined } : i)),
  }
}

/**
 * Puts a removed cluster back at its old position (undo), and returns the ideas that were in it to it.
 * Only ideas still in the tray are moved back, so an idea the person has since put elsewhere stays there.
 */
export function restoreCluster(
  clusters: readonly IdeaCluster[],
  ideas: readonly Idea[],
  cluster: IdeaCluster,
  index: number,
  memberIds: readonly string[],
): { clusters: IdeaCluster[]; ideas: Idea[] } {
  const at = Math.max(0, Math.min(index, clusters.length))
  const members = new Set(memberIds)
  return {
    clusters: clusters.some((c) => c.id === cluster.id) ? [...clusters] : [...clusters.slice(0, at), cluster, ...clusters.slice(at)],
    ideas: ideas.map((i) => (members.has(i.id) && !i.clusterId ? { ...i, clusterId: cluster.id } : i)),
  }
}

export interface IdeaGroups {
  tray: Idea[]
  byCluster: Map<string, Idea[]>
}

/** Ideas split into the tray and one list per cluster, each in capture order. An idea pointing at a cluster that is gone counts as unclustered. */
export function groupIdeas(ideas: readonly Idea[], clusters: readonly IdeaCluster[]): IdeaGroups {
  const byCluster = new Map<string, Idea[]>(clusters.map((c) => [c.id, []]))
  const tray: Idea[] = []
  for (const idea of ideas) {
    const list = idea.clusterId ? byCluster.get(idea.clusterId) : undefined
    if (list) list.push(idea)
    else tray.push(idea)
  }
  return { tray, byCluster }
}

/** Starred first, then capture order. Stable, so ideas of the same kind never swap places. */
export const starredFirst = (ideas: readonly Idea[]): Idea[] => [...ideas.filter((i) => i.starred), ...ideas.filter((i) => !i.starred)]

export interface ConversionTargets {
  tasks: readonly Pick<Task, 'id'>[]
  notes: readonly Pick<Note, 'id'>[]
  projects: readonly Pick<Project, 'id'>[]
}

/** True when the idea became something that still exists. If the task, note or project was deleted since, the idea can be converted again. */
export function isProcessed(idea: Idea, targets: ConversionTargets): boolean {
  const done = idea.convertedTo
  if (!done) return false
  const pool = done.kind === 'task' ? targets.tasks : done.kind === 'note' ? targets.notes : targets.projects
  return pool.some((t) => t.id === done.id)
}

/**
 * A title short enough for a task or project name. Text over `max` characters is cut at a word and the whole text goes
 * to `description`, so nothing the person wrote is lost.
 */
export function splitTitle(text: string, max: number): { title: string; description?: string } {
  const clean = text.trim().replace(/\s+/g, ' ')
  if (clean.length <= max) return { title: clean }
  const head = clean.slice(0, max)
  const space = head.lastIndexOf(' ')
  const cut = space > max * 0.6 ? head.slice(0, space) : head
  return { title: `${cut.replace(/[\s.,;:!?-]+$/, '')}…`, description: clean }
}
