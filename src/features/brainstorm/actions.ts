import { brainstormRepo } from '@/data/repos'
import { excerptFromContent } from '@/features/notes/lib/excerpt'
import { newProject, newTask } from '@/lib/entityDefaults'
import { useNoteStore, useProjectStore, useTaskStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { BrainstormSession, Idea, IdeaCluster, IdeaConversion, IdeaConversionKind, IdeaRating, NewEntity, NoteContent } from '@/types/domain'
import {
  addCluster,
  addIdea,
  isProcessed,
  moveIdea,
  recolorCluster,
  removeCluster,
  removeIdea,
  renameCluster,
  renameIdea,
  restoreCluster,
  restoreIdea,
  setConversion,
  splitTitle,
  toggleStar,
} from './lib/ideas'
import { setRating, type RatingField } from './lib/matrix'
import { useBrainstormStore } from './store/brainstormStore'

type SessionPatch = Partial<NewEntity<BrainstormSession>>

const toast = (message: string, action?: { label: string; run: () => void }) => useUiStore.getState().showToast(message, action)
const store = () => useBrainstormStore.getState()
const sessionOf = (id: string) => store().items.find((s) => s.id === id)

/**
 * Applies an edit to the session as it is right now, not as a component last drew it, so two quick edits in a row
 * (a fast typist adding ideas, a drag right after a rename) never overwrite each other.
 * `edit` may return null to say there is nothing to write.
 */
export async function editSession(id: string, edit: (session: BrainstormSession) => SessionPatch | null): Promise<void> {
  const session = sessionOf(id)
  if (!session) return
  const patch = edit(session)
  if (patch) await store().update(id, patch)
}

// ---------------------------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------------------------

export interface NewSessionInput {
  title: string
  question?: string
  projectId?: string
}

export const createSession = (input: NewSessionInput): Promise<BrainstormSession> =>
  store().add({
    title: input.title.trim(),
    question: input.question?.trim() || undefined,
    projectId: input.projectId || undefined,
    ideas: [],
    clusters: [],
  })

export const updateSessionDetails = (id: string, patch: Pick<SessionPatch, 'title' | 'question' | 'projectId'>): Promise<void> => editSession(id, () => patch)

export const unarchiveSession = (session: BrainstormSession): Promise<void> => store().update(session.id, { archivedAt: undefined })

/** Moves a session to the archive. Nothing is deleted; the undo and "Pulihkan" bring it back. */
export async function archiveSessionWithUndo(session: BrainstormSession): Promise<void> {
  await store().update(session.id, { archivedAt: new Date().toISOString() })
  toast('Sesi diarsipkan.', { label: 'Urungkan', run: () => void unarchiveSession(session).catch(() => toast('Sesi gagal dikembalikan.')) })
}

async function restoreSession(session: BrainstormSession): Promise<void> {
  const restored = await brainstormRepo.restore(session)
  useBrainstormStore.setState((s) => ({ items: [...s.items, restored] }))
}

/** Deletes a session for good. The undo brings it back with its ideas, id and timestamps. */
export async function deleteSessionWithUndo(session: BrainstormSession): Promise<void> {
  await store().remove(session.id)
  toast('Sesi dihapus.', { label: 'Urungkan', run: () => void restoreSession(session).catch(() => toast('Sesi gagal dikembalikan.')) })
}

// ---------------------------------------------------------------------------------------------
// Ideas
// ---------------------------------------------------------------------------------------------

export const addIdeaTo = (sessionId: string, text: string, clusterId?: string): Promise<void> =>
  editSession(sessionId, (s) => {
    const ideas = addIdea(s.ideas, text, clusterId)
    return ideas.length === s.ideas.length ? null : { ideas }
  })

export const editIdea = (sessionId: string, ideaId: string, text: string): Promise<void> => editSession(sessionId, (s) => ({ ideas: renameIdea(s.ideas, ideaId, text) }))

export const toggleIdeaStar = (sessionId: string, ideaId: string): Promise<void> => editSession(sessionId, (s) => ({ ideas: toggleStar(s.ideas, ideaId) }))

export const moveIdeaTo = (sessionId: string, ideaId: string, clusterId: string | undefined): Promise<void> =>
  editSession(sessionId, (s) => {
    const idea = s.ideas.find((i) => i.id === ideaId)
    return !idea || idea.clusterId === clusterId ? null : { ideas: moveIdea(s.ideas, ideaId, clusterId) }
  })

/** Sets the impact or effort of an idea, or clears it when `value` is undefined. Writing the score it already has does nothing. */
export const rateIdea = (sessionId: string, ideaId: string, field: RatingField, value: IdeaRating | undefined): Promise<void> =>
  editSession(sessionId, (s) => {
    const idea = s.ideas.find((i) => i.id === ideaId)
    return !idea || idea[field] === value ? null : { ideas: setRating(s.ideas, ideaId, field, value) }
  })

export async function deleteIdeaWithUndo(sessionId: string, idea: Idea): Promise<void> {
  const index = sessionOf(sessionId)?.ideas.findIndex((i) => i.id === idea.id) ?? -1
  await editSession(sessionId, (s) => ({ ideas: removeIdea(s.ideas, idea.id) }))
  toast('Ide dihapus.', {
    label: 'Urungkan',
    run: () => void editSession(sessionId, (s) => ({ ideas: restoreIdea(s.ideas, idea, index) })).catch(() => toast('Ide gagal dikembalikan.')),
  })
}

// ---------------------------------------------------------------------------------------------
// Clusters
// ---------------------------------------------------------------------------------------------

export const addClusterTo = (sessionId: string, name: string): Promise<void> =>
  editSession(sessionId, (s) => {
    const clusters = addCluster(s.clusters, name)
    return clusters.length === s.clusters.length ? null : { clusters }
  })

export const renameClusterIn = (sessionId: string, clusterId: string, name: string): Promise<void> => editSession(sessionId, (s) => ({ clusters: renameCluster(s.clusters, clusterId, name) }))

export const recolorClusterIn = (sessionId: string, clusterId: string): Promise<void> => editSession(sessionId, (s) => ({ clusters: recolorCluster(s.clusters, clusterId) }))

/** Removes a cluster and returns its ideas to the tray. The undo puts the cluster and its ideas back. */
export async function deleteClusterWithUndo(sessionId: string, cluster: IdeaCluster): Promise<void> {
  const session = sessionOf(sessionId)
  if (!session) return
  const index = session.clusters.findIndex((c) => c.id === cluster.id)
  const memberIds = session.ideas.filter((i) => i.clusterId === cluster.id).map((i) => i.id)
  await editSession(sessionId, (s) => removeCluster(s.clusters, s.ideas, cluster.id))
  toast(memberIds.length > 0 ? `Kelompok dihapus. ${memberIds.length} ide kembali ke "Belum dikelompokkan".` : 'Kelompok dihapus.', {
    label: 'Urungkan',
    run: () => void editSession(sessionId, (s) => restoreCluster(s.clusters, s.ideas, cluster, index, memberIds)).catch(() => toast('Kelompok gagal dikembalikan.')),
  })
}

// ---------------------------------------------------------------------------------------------
// Quick capture
// ---------------------------------------------------------------------------------------------

/**
 * Saves an idea into the Inbox Ide from anywhere in the app, such as the command palette. It goes to the repo first and
 * is mirrored into the store afterwards, so it works before the brainstorm page has ever opened. If the inbox is
 * missing it is created again. Resolves with false when the text is blank.
 */
export async function captureIdea(text: string): Promise<boolean> {
  if (!text.trim()) return false
  const sessions = await brainstormRepo.list()
  const inbox =
    sessions.find((s) => s.inbox) ??
    (await brainstormRepo.create({ title: 'Inbox Ide', question: 'Ide yang muncul di tengah pekerjaan, sebelum sempat dipilah.', inbox: true, ideas: [], clusters: [] }))
  const saved = await brainstormRepo.update(inbox.id, { ideas: addIdea(inbox.ideas, text) })
  useBrainstormStore.setState((s) => {
    if (s.status === 'idle') return s
    return { items: s.items.some((i) => i.id === saved.id) ? s.items.map((i) => (i.id === saved.id ? saved : i)) : [...s.items, saved] }
  })
  return true
}

// ---------------------------------------------------------------------------------------------
// Turning an idea into something to do
// ---------------------------------------------------------------------------------------------

const TASK_TITLE_MAX = 120
const PROJECT_NAME_MAX = 60

/** Only a project that still exists. A session can outlive the project it was linked to. */
const liveProjectId = (projectId: string | undefined) => (projectId && useProjectStore.getState().items.some((p) => p.id === projectId) ? projectId : undefined)

async function createTarget(kind: IdeaConversionKind, idea: Idea, projectId: string | undefined): Promise<IdeaConversion> {
  if (kind === 'task') {
    const { title, description } = splitTitle(idea.text, TASK_TITLE_MAX)
    const task = await useTaskStore.getState().add(newTask({ title, description, status: 'todo', priority: 'medium', projectId }, useTaskStore.getState().items))
    return { kind, id: task.id }
  }
  if (kind === 'note') {
    const { title, description } = splitTitle(idea.text, TASK_TITLE_MAX)
    const content: NoteContent = { type: 'doc', content: [description ? { type: 'paragraph', content: [{ type: 'text', text: description }] } : { type: 'paragraph' }] }
    const note = await useNoteStore.getState().add({ title, content, excerpt: excerptFromContent(content), tags: [], pinned: false, projectId })
    return { kind, id: note.id }
  }
  const { title, description } = splitTitle(idea.text, PROJECT_NAME_MAX)
  const project = await useProjectStore.getState().add(newProject({ name: title, description, status: 'active', phase: 'riset' }))
  return { kind, id: project.id }
}

function removeTarget({ kind, id }: IdeaConversion): Promise<void> {
  if (kind === 'task') return useTaskStore.getState().remove(id)
  if (kind === 'note') return useNoteStore.getState().remove(id)
  return useProjectStore.getState().remove(id)
}

const DONE_MESSAGE: Record<IdeaConversionKind, (created: IdeaConversion) => string> = {
  task: (c) => `Task ${c.id} dibuat dari ide.`,
  note: () => 'Catatan dibuat dari ide.',
  project: () => 'Project dibuat dari ide.',
}

const inFlight = new Set<string>()

/**
 * Creates a task, note or project from an idea and remembers it on the idea, so the idea links to it and cannot be
 * turned into a second copy by a double click. If remembering fails, the thing just created is removed again.
 * The undo removes it and clears the link.
 */
export async function convertIdea(sessionId: string, ideaId: string, kind: IdeaConversionKind): Promise<void> {
  const key = `${sessionId}:${ideaId}`
  const session = sessionOf(sessionId)
  const idea = session?.ideas.find((i) => i.id === ideaId)
  if (!session || !idea || inFlight.has(key)) return
  const targets = { tasks: useTaskStore.getState().items, notes: useNoteStore.getState().items, projects: useProjectStore.getState().items }
  if (isProcessed(idea, targets)) return

  inFlight.add(key)
  try {
    const created = await createTarget(kind, idea, liveProjectId(session.projectId))
    try {
      await editSession(sessionId, (s) => ({ ideas: setConversion(s.ideas, ideaId, created) }))
    } catch (error) {
      await removeTarget(created).catch(() => undefined)
      throw error
    }
    toast(DONE_MESSAGE[kind](created), {
      label: 'Urungkan',
      run: () =>
        void removeTarget(created)
          .then(() => editSession(sessionId, (s) => ({ ideas: setConversion(s.ideas, ideaId, undefined) })))
          .catch(() => toast('Pembatalan gagal.')),
    })
  } finally {
    inFlight.delete(key)
  }
}
