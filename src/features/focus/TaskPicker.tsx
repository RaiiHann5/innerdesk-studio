import { useEffect, useMemo } from 'react'
import { useProjectStore, useTaskStore } from '@/stores/entities'
import { useFocusStore } from './store/focusStore'

interface TaskPickerProps {
  value?: string
  onChange: (taskId: string | undefined, projectId: string | undefined) => void
  /** Picking a task while a block is running would misattribute it, so the control is disabled. */
  disabled?: boolean
}

/**
 * "Sedang dikerjakan": the open tasks, grouped by project.
 *
 * Only unfinished tasks are offered, because a block attributed to finished work is a mistake the
 * person would have to remember to undo.
 */
export function TaskPicker({ value, onChange, disabled }: TaskPickerProps) {
  const tasks = useTaskStore((s) => s.items)
  const projects = useProjectStore((s) => s.items)

  const groups = useMemo(() => {
    const open = tasks.filter((t) => t.status !== 'done' && !t.archivedAt)
    const projectById = new Map(projects.map((p) => [p.id, p.name]))
    const byProject = new Map<string, typeof open>()
    for (const task of open) {
      const key = task.projectId ?? ''
      byProject.set(key, [...(byProject.get(key) ?? []), task])
    }
    return [...byProject.entries()]
      .map(([projectId, list]) => ({
        label: projectById.get(projectId) ?? 'Tanpa project',
        tasks: list.sort((a, b) => a.title.localeCompare(b.title, 'id')),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'id'))
  }, [tasks, projects])

  const selected = tasks.find((t) => t.id === value)

  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">Sedang dikerjakan</span>
      <select
        value={selected?.status === 'done' ? '' : (value ?? '')}
        disabled={disabled}
        onChange={(e) => {
          const id = e.target.value || undefined
          onChange(id, tasks.find((t) => t.id === id)?.projectId)
        }}
        className="h-8 w-full rounded-control border bg-surface px-2.5 text-sm text-ink transition-colors duration-fast hover:border-faint disabled:opacity-60"
      >
        <option value="">Tanpa task</option>
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {selected && !disabled && <p className="text-xs text-muted">{selected.focusCount} blok fokus selesai di task ini.</p>}
    </label>
  )
}

/** Wires the picker to the store. Kept separate so the presentational picker stays testable. */
export function useTaskPicker(disabled?: boolean) {
  const taskId = useFocusStore((s) => s.taskId)
  const projectId = useFocusStore((s) => s.projectId)
  const setTask = useFocusStore((s) => s.setTask)
  const tasks = useTaskStore((s) => s.items)

  // A task deleted while a block is running must not leave the run pointing at nothing.
  useEffect(() => {
    if (!taskId) return
    if (!tasks.some((t) => t.id === taskId)) setTask(undefined, undefined)
  }, [taskId, tasks, setTask])

  return {
    taskId,
    projectId,
    picker: { value: taskId, disabled, onChange: setTask },
  }
}