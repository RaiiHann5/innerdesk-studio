import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, ArrowCounterClockwise, Trash } from '@phosphor-icons/react'
import { SheetPanel } from '@/components/layout/SheetPanel'
import { Button } from '@/components/ui/Button'
import { Field, controlClass } from '@/components/ui/Field'
import { SaveStatus } from '@/features/notes/SaveStatus'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/date'
import { PRIORITY_LABEL, STATUS_LABEL } from '@/lib/labels'
import { parseTags } from '@/lib/taskFields'
import { parseEstimate } from '@/lib/taskTime'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { toastWithRetry } from '@/stores/retryToast'
import { useUiStore } from '@/stores/ui'
import type { Priority, Project, Subtask, Task, TaskRecurrence, TaskStatus } from '@/types/domain'
import { SubtaskList } from './SubtaskList'
import { EstimateField, RecurrenceField } from './TaskFields'
import { TaskTimeBlock } from './TaskTimeBlock'
import { archiveTasksWithUndo, changeStatus, deleteTasksWithUndo, prepareFocus, unarchiveTask } from './taskActions'
import { useTaskAutosave } from './useTaskAutosave'

const STATUSES = Object.keys(STATUS_LABEL) as TaskStatus[]
const PRIORITIES = Object.keys(PRIORITY_LABEL) as Priority[]

interface TaskPanelProps {
  /** The live task from the store. The panel is keyed by its id, so a different task remounts it. */
  task: Task
  projects: Project[]
  /** Must be stable (useCallback): the panel re-focuses itself when this changes. */
  onClose: () => void
}

/**
 * The task detail: a drawer on desktop, a bottom sheet on a phone. Fields save by themselves, with the same
 * status line and retry as a note. Typing waits for a pause; a select or a checkbox saves at once.
 */
export function TaskPanel({ task, projects, onClose }: TaskPanelProps) {
  const phone = useMediaQuery('(max-width: 767px)')
  const navigate = useNavigate()
  const showToast = useUiStore((s) => s.showToast)
  const { status, savedAt, change, commit, flush, cancel, retry } = useTaskAutosave(task.id)

  // What is typed lives here, so the fields stay smooth while the save waits for a pause.
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [tags, setTags] = useState(task.tags.join(', '))
  const [estimate, setEstimate] = useState(task.estimateMinutes ? String(task.estimateMinutes) : '')
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks)
  const [recurrence, setRecurrence] = useState<TaskRecurrence | undefined>(task.recurrence)
  const lastTitle = useRef(task.title)


  const onTitle = (value: string) => {
    setTitle(value)
    if (value.trim()) {
      lastTitle.current = value.trim()
      change({ title: value.trim() })
    }
  }
  const onEstimate = (value: string) => {
    setEstimate(value)
    if (value.trim() === '') change({ estimateMinutes: undefined })
    else if (parseEstimate(value) !== undefined) change({ estimateMinutes: parseEstimate(value) })
  }
  const onDueDate = (value: string) => {
    setDueDate(value)
    // A time without a date would sit nowhere on the calendar, so clearing the date clears the time too.
    void commit(value ? { dueDate: value } : { dueDate: undefined, dueTime: undefined })
  }
  const onStatus = (next: TaskStatus) => {
    const run = () => changeStatus(task, next)
    void flush().then(run).catch(() => toastWithRetry('Task gagal diperbarui.', run))
  }
  const onSubtasks = (next: Subtask[]) => {
    setSubtasks(next)
    void commit({ subtasks: next })
  }
  const onRecurrence = (next: TaskRecurrence | undefined) => {
    setRecurrence(next)
    void commit({ recurrence: next })
  }

  const startFocus = () => {
    void flush()
    if (prepareFocus(task) === 'busy') showToast('Timer fokus sedang berjalan. Selesaikan atau jeda dulu, lalu pilih task ini.')
    navigate('/focus')
  }
  const remove = () => {
    cancel()
    onClose()
    void deleteTasksWithUndo([task])
  }
  const archive = () => {
    void flush().then(() => {
      onClose()
      return archiveTasksWithUndo([task])
    })
  }
  const restore = () => unarchiveTask(task).catch(() => toastWithRetry('Task gagal dipulihkan.', () => unarchiveTask(task)))

  return (
    <SheetPanel
      open
      onClose={onClose}
      label={`Task ${task.id}`}
      sheet={phone}
      wide
      headerExtra={<SaveStatus status={status} savedAt={savedAt ?? task.updatedAt} onRetry={() => void retry()} />}
    >
      <div className="space-y-5">
        {task.archivedAt && (
          <p className="flex items-center justify-between gap-2 rounded-control border bg-sunken/50 px-3 py-2 text-sm">
            <span>Task ini diarsipkan.</span>
            <Button onClick={restore}>
              <ArrowCounterClockwise aria-hidden />
              Pulihkan
            </Button>
          </p>
        )}

        <Field label="Judul" htmlFor="panel-title">
          <input
            id="panel-title"
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            onBlur={() => !title.trim() && setTitle(lastTitle.current)}
            aria-invalid={!title.trim()}
            aria-describedby={!title.trim() ? 'panel-title-error' : undefined}
            className={cn(controlClass, 'h-9 font-medium')}
          />
          {!title.trim() && (
            <p id="panel-title-error" role="alert" className="text-xs font-medium text-status-overdue">
              Judul task wajib diisi.
            </p>
          )}
        </Field>

        <Field label="Deskripsi" htmlFor="panel-description">
          <textarea
            id="panel-description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              change({ description: e.target.value.trim() || undefined })
            }}
            rows={3}
            className={cn(controlClass, 'h-auto resize-none py-1.5')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor="panel-status">
            <select id="panel-status" value={task.status} onChange={(e) => onStatus(e.target.value as TaskStatus)} className={controlClass}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prioritas" htmlFor="panel-priority">
            <select id="panel-priority" defaultValue={task.priority} onChange={(e) => void commit({ priority: e.target.value as Priority })} className={controlClass}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project" htmlFor="panel-project">
            <select id="panel-project" defaultValue={task.projectId ?? ''} onChange={(e) => void commit({ projectId: e.target.value || undefined })} className={controlClass}>
              <option value="">Tanpa project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tenggat" htmlFor="panel-due">
            <input id="panel-due" type="date" value={dueDate} onChange={(e) => onDueDate(e.target.value)} className={cn(controlClass, 'tabular-nums')} />
          </Field>
          <Field label="Jam tenggat" htmlFor="panel-due-time" hint="Mengisi jam menaruh task di kalender pada jam itu.">
            <input
              id="panel-due-time"
              type="time"
              step={300}
              disabled={!dueDate}
              defaultValue={task.dueTime ?? ''}
              onChange={(e) => void commit({ dueTime: e.target.value || undefined })}
              className={cn(controlClass, 'tabular-nums disabled:opacity-50')}
            />
          </Field>
          <EstimateField id="panel-estimate" text={estimate} onText={onEstimate} />
        </div>

        <RecurrenceField id="panel-recurrence" value={recurrence} onChange={onRecurrence} />

        <Field label="Tag" htmlFor="panel-tags" hint="Pisahkan dengan koma.">
          <input
            id="panel-tags"
            value={tags}
            onChange={(e) => {
              setTags(e.target.value)
              change({ tags: parseTags(e.target.value) })
            }}
            placeholder="frontend, revisi"
            className={controlClass}
          />
        </Field>

        <SubtaskList items={subtasks} onChange={onSubtasks} />
        <TaskTimeBlock task={task} onStartFocus={startFocus} />

        <dl className="space-y-1 border-t pt-4 text-xs text-muted">
          <div className="flex justify-between gap-2">
            <dt>Catatan terkait</dt>
            <dd className="tabular-nums">{task.noteCount > 0 ? task.noteCount : 'Belum ada'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Dibuat</dt>
            <dd className="tabular-nums">{fmt(task.createdAt, 'd MMM yyyy')}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          {!task.archivedAt ? (
            <Button variant="ghost" onClick={archive}>
              <Archive aria-hidden />
              Arsipkan
            </Button>
          ) : (
            <span />
          )}
          <Button variant="ghost" onClick={remove} className="text-status-overdue">
            <Trash aria-hidden />
            Hapus task
          </Button>
        </div>
      </div>
    </SheetPanel>
  )
}
