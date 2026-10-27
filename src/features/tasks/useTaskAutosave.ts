import { useCallback, useRef } from 'react'
import { useAutosave } from '@/features/notes/hooks/useAutosave'
import { useTaskStore } from '@/stores/entities'
import type { NewEntity, Task } from '@/types/domain'

export type TaskPatch = Partial<NewEntity<Task>>

/**
 * Autosave for the task panel, the same machinery the notes editor uses (debounce, one save at a time,
 * flush on leave, retry after an error). Fields edited close together are merged into one patch, so a
 * title and a tag typed within the delay become a single write.
 *
 * `change` is for typing and waits for a pause. `commit` is for a deliberate choice (a select, a checkbox)
 * and writes right away.
 */
export function useTaskAutosave(taskId: string) {
  const merged = useRef<TaskPatch>({})
  const save = useCallback((id: string, patch: TaskPatch) => useTaskStore.getState().update(id, patch), [])
  const { status, savedAt, schedule, flush, cancel, retry } = useAutosave<TaskPatch>({ id: taskId, save })

  const change = useCallback(
    (patch: TaskPatch) => {
      merged.current = { ...merged.current, ...patch }
      schedule(merged.current)
    },
    [schedule],
  )
  const commit = useCallback(
    (patch: TaskPatch) => {
      change(patch)
      return flush()
    },
    [change, flush],
  )

  return { status, savedAt, change, commit, flush, cancel, retry }
}
