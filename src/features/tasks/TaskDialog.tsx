import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { newTask } from '@/lib/entityDefaults'
import { PRIORITY_LABEL, STATUS_LABEL } from '@/lib/labels'
import { parseTags } from '@/lib/taskFields'
import { parseEstimate } from '@/lib/taskTime'
import { useTaskStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { Priority, Project, TaskRecurrence, TaskStatus } from '@/types/domain'
import { EstimateField, RecurrenceField } from './TaskFields'
import { statusPatch } from './taskActions'

/** Where a new task starts. Editing an existing task happens in the detail panel, not here. */
export interface TaskDialogState {
  status: TaskStatus
  projectId?: string
}

interface TaskDialogProps {
  state: TaskDialogState | null
  projects: Project[]
  onClose: () => void
}

const STATUSES = Object.keys(STATUS_LABEL) as TaskStatus[]
const PRIORITIES = Object.keys(PRIORITY_LABEL) as Priority[]

export function TaskDialog({ state, projects, onClose }: TaskDialogProps) {
  return (
    <Dialog open={state !== null} onClose={onClose} label="Task baru" className="mt-[6vh] max-w-lg">
      {state && <TaskForm key={state.status} state={state} projects={projects} onClose={onClose} />}
    </Dialog>
  )
}

function TaskForm({ state, projects, onClose }: Required<TaskDialogProps> & { state: TaskDialogState }) {
  const add = useTaskStore((s) => s.add)
  const showToast = useUiStore((s) => s.showToast)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>(state.status)
  const [priority, setPriority] = useState<Priority>('medium')
  const [projectId, setProjectId] = useState(state.projectId ?? '')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [tags, setTags] = useState('')
  const [estimate, setEstimate] = useState('')
  const [recurrence, setRecurrence] = useState<TaskRecurrence | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return setError('Judul task wajib diisi.')
    if (estimate.trim() && parseEstimate(estimate) === undefined) return setError('Estimasi harus berupa bilangan bulat menit.')
    setSaving(true)
    try {
      await add(
        newTask(
          {
            title: trimmed,
            description: description.trim() || undefined,
            priority,
            projectId: projectId || undefined,
            dueDate: dueDate || undefined,
            dueTime: dueDate && dueTime ? dueTime : undefined,
            tags: parseTags(tags),
            estimateMinutes: parseEstimate(estimate),
            recurrence,
            ...statusPatch(status),
            status,
          },
          useTaskStore.getState().items,
        ),
      )
      showToast('Task dibuat')
      onClose()
    } catch {
      setError('Task gagal disimpan. Coba lagi.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="max-h-[75dvh] space-y-4 overflow-y-auto p-4">
        <h2 className="text-lg font-bold tracking-tight">Task baru</h2>

        <Field label="Judul" htmlFor="task-title">
          <input
            id="task-title"
            autoFocus
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setError(null)
            }}
            aria-invalid={error !== null && !title.trim()}
            aria-describedby={error ? 'task-error' : undefined}
            placeholder="Misalnya: Kirim revisi desain ke klien"
            className={controlClass}
          />
        </Field>

        <Field label="Deskripsi" htmlFor="task-description">
          <textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={cn(controlClass, 'h-auto resize-none py-1.5')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor="task-status">
            <select id="task-status" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className={controlClass}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prioritas" htmlFor="task-priority">
            <select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={controlClass}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project" htmlFor="task-project">
            <select id="task-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={controlClass}>
              <option value="">Tanpa project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tenggat" htmlFor="task-due">
            <input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={cn(controlClass, 'tabular-nums')} />
          </Field>
          <Field label="Jam tenggat" htmlFor="task-due-time" hint="Opsional. Mengisi ini menaruh task di kalender pada jam tersebut.">
            <input
              id="task-due-time"
              type="time"
              step={300}
              disabled={!dueDate}
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className={cn(controlClass, 'tabular-nums disabled:opacity-50')}
            />
          </Field>
          <EstimateField id="task-estimate" text={estimate} onText={setEstimate} />
        </div>

        <RecurrenceField id="task-recurrence" value={recurrence} onChange={setRecurrence} />

        <Field label="Tag" htmlFor="task-tags" hint="Pisahkan dengan koma.">
          <input id="task-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="frontend, revisi" className={controlClass} />
        </Field>

        {error && (
          <p id="task-error" role="alert" className="text-sm font-medium text-status-overdue">
            {error}
          </p>
        )}
      </div>

      <footer className="flex items-center justify-end gap-2 border-t bg-sunken/50 px-4 py-3">
        <Button onClick={onClose}>Batal</Button>
        <Button type="submit" variant="primary" disabled={saving}>
          Buat task
        </Button>
      </footer>
    </form>
  )
}
