import { toggleMilestone } from '@/lib/milestones'
import { nextPhase } from '@/lib/projectPhase'
import { planDuplicate } from '@/lib/projectDuplicate'
import { useProjectStore, useTaskStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { Milestone, Project, ProjectLinkItem } from '@/types/domain'

const toast = (message: string, action?: { label: string; run: () => void }) => useUiStore.getState().showToast(message, action)
const store = () => useProjectStore.getState()

export const saveMilestones = (project: Project, milestones: Milestone[]): Promise<void> => store().update(project.id, { milestones })
export const saveLinks = (project: Project, links: ProjectLinkItem[]): Promise<void> => store().update(project.id, { links })

/** Checks or unchecks one milestone, reading the project fresh so a stale chip cannot overwrite a newer list. */
export async function toggleMilestoneDone(projectId: string, milestoneId: string): Promise<void> {
  const project = store().items.find((p) => p.id === projectId)
  if (!project) return
  await store().update(projectId, { milestones: toggleMilestone(project.milestones, milestoneId) })
}

/** Moves the project to its next phase. Resolves with the new phase, or null when it is already at the last one. */
export async function advancePhase(project: Project) {
  const next = nextPhase(project.phase)
  if (!next) return null
  await store().update(project.id, { phase: next })
  return next
}

export const unarchiveProject = (project: Project): Promise<void> => store().update(project.id, { archivedAt: undefined })

/** Hides a project from the board and the active count. Nothing is deleted; "Pulihkan" or the undo brings it back. */
export async function archiveProjectWithUndo(project: Project): Promise<void> {
  await store().update(project.id, { archivedAt: new Date().toISOString() })
  toast('Project diarsipkan.', { label: 'Urungkan', run: () => void unarchiveProject(project).catch(() => toast('Project gagal dikembalikan.')) })
}

/**
 * Copies a project and its plan (see planDuplicate). Resolves with the copy. If any task fails to copy, what was
 * already created is removed again, so there is never a half-copied project. The undo removes the copy and its tasks.
 */
export async function duplicateProjectWithUndo(project: Project): Promise<Project> {
  const plan = planDuplicate(project, useTaskStore.getState().items)
  const created = await store().add(plan.project)
  const createdTasks: string[] = []
  try {
    for (const draft of plan.tasks) {
      const task = await useTaskStore.getState().add({ ...draft, projectId: created.id })
      createdTasks.push(task.id)
    }
  } catch (error) {
    await Promise.allSettled(createdTasks.map((id) => useTaskStore.getState().remove(id)))
    await store().remove(created.id)
    throw error
  }
  toast('Project diduplikasi.', {
    label: 'Urungkan',
    run: () =>
      void Promise.all([...createdTasks.map((id) => useTaskStore.getState().remove(id)), store().remove(created.id)]).catch(() =>
        toast('Salinan gagal dihapus.'),
      ),
  })
  return created
}

