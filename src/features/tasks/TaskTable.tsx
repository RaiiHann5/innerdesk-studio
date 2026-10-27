import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react'
import { CaretDown, CaretRight } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { dueLabel, isOverdue } from '@/lib/date'
import { STATUS_LABEL } from '@/lib/labels'
import { subtaskProgress } from '@/lib/subtasks'
import type { TaskGroup } from '@/lib/taskQuery'
import { allState, selectRange, toggleAll, toggleId } from '@/lib/taskSelection'
import type { Project, Task } from '@/types/domain'
import { PriorityTag } from './PriorityTag'
import { statusDot } from './StatusPill'

interface TaskTableProps {
  /** Already filtered and sorted. */
  tasks: Task[]
  /** Set to show the rows in collapsible groups. */
  groups: TaskGroup[] | null
  collapsed: ReadonlySet<string>
  onToggleGroup: (key: string) => void
  selected: ReadonlySet<string>
  onSelect: (next: ReadonlySet<string>) => void
  projectById: Map<string, Project>
  showProject: boolean
  onOpen: (task: Task) => void
}

const head = 'whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted'
const cell = 'px-3 py-2.5 align-middle'
const checkClass = 'size-4 accent-[rgb(var(--accent-text))]'

export function TaskTable({ tasks, groups, collapsed, onToggleGroup, selected, onSelect, projectById, showProject, onOpen }: TaskTableProps) {
  const anchor = useRef<string | null>(null)
  const headerCheck = useRef<HTMLInputElement>(null)
  const wrapper = useRef<HTMLDivElement>(null)

  // Rows in the order they are shown. Rows in a collapsed group are not on screen, so a range skips them.
  const shown = useMemo(
    () => (groups ? groups.filter((g) => !collapsed.has(g.key)).flatMap((g) => g.tasks) : tasks),
    [groups, collapsed, tasks],
  )
  const ordered = useMemo(() => shown.map((t) => t.id), [shown])
  const state = allState(selected, ordered)
  const columns = 7 + (showProject ? 1 : 0)

  useEffect(() => {
    if (headerCheck.current) headerCheck.current.indeterminate = state === 'some'
  }, [state])

  const onRow = (id: string, shift: boolean) => {
    onSelect(shift ? selectRange(selected, ordered, anchor.current, id) : toggleId(selected, id))
    anchor.current = id
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && selected.size > 0) {
      e.stopPropagation()
      onSelect(new Set())
      return
    }
    const target = e.target as HTMLElement
    if ((e.key !== 'ArrowDown' && e.key !== 'ArrowUp') || !target.matches('[data-row-check]')) return
    const boxes = Array.from(wrapper.current?.querySelectorAll<HTMLInputElement>('[data-row-check]') ?? [])
    const next = boxes[boxes.indexOf(target as HTMLInputElement) + (e.key === 'ArrowDown' ? 1 : -1)]
    if (next) {
      e.preventDefault()
      next.focus()
    }
  }

  const row = (task: Task) => {
    const done = task.status === 'done'
    const overdue = !!task.dueDate && !done && isOverdue(task.dueDate)
    const progress = subtaskProgress(task.subtasks)
    const isSelected = selected.has(task.id)
    return (
      <tr key={task.id} className={cn('border-b last:border-b-0 hover:bg-sunken/40', isSelected && 'bg-sunken/60')}>
        <td className="w-10 px-3 py-2.5 align-middle">
          <input
            type="checkbox"
            data-row-check
            checked={isSelected}
            onChange={(e) => onRow(task.id, (e.nativeEvent as MouseEvent).shiftKey === true)}
            aria-label={`Pilih ${task.title}`}
            className={checkClass}
          />
        </td>
        <td className={cn(cell, 'whitespace-nowrap tabular-nums text-muted')}>{task.id}</td>
        <td className={cn(cell, 'max-w-80')}>
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpen(task)}
              className={cn('block min-w-0 truncate text-left font-medium hover:underline', done && 'text-muted line-through decoration-faint')}
            >
              {task.title}
            </button>
            {progress && (
              <span className="shrink-0 text-xs tabular-nums text-muted">
                <span className="sr-only">Subtask selesai: </span>
                {progress.done}/{progress.total}
              </span>
            )}
          </span>
        </td>
        {showProject && <td className={cn(cell, 'max-w-48 truncate text-muted')}>{task.projectId ? (projectById.get(task.projectId)?.name ?? '') : ''}</td>}
        <td className={cell}>
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span aria-hidden className={cn('size-2 rounded-full', statusDot[task.status])} />
            {STATUS_LABEL[task.status]}
          </span>
        </td>
        <td className={cell}>
          <PriorityTag priority={task.priority} />
        </td>
        <td className={cn(cell, 'whitespace-nowrap tabular-nums', overdue ? 'font-medium text-status-overdue' : 'text-muted')}>
          {task.dueDate ? (
            <>
              {overdue && <span className="sr-only">Terlambat, </span>}
              {dueLabel(task.dueDate)}
            </>
          ) : (
            'Tanpa tenggat'
          )}
        </td>
        <td className={cn(cell, 'text-right tabular-nums text-muted')}>{task.noteCount > 0 ? task.noteCount : ''}</td>
      </tr>
    )
  }

  return (
    <div ref={wrapper} onKeyDown={onKeyDown} className="relative overflow-x-auto rounded-card border bg-surface">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <caption className="sr-only">Daftar task. Panah atas dan bawah berpindah antar kotak pilih, Spasi memilih, Shift menandai rentang, Escape membatalkan pilihan.</caption>
        <thead className="border-b bg-sunken/50">
          <tr>
            <th scope="col" className="w-10 px-3 py-2">
              <input
                ref={headerCheck}
                type="checkbox"
                checked={state === 'all'}
                onChange={() => onSelect(toggleAll(selected, ordered))}
                aria-label="Pilih semua task yang tampil"
                className={checkClass}
              />
            </th>
            <th scope="col" className={head}>ID</th>
            <th scope="col" className={head}>Task</th>
            {showProject && (
              <th scope="col" className={head}>
                Project
              </th>
            )}
            <th scope="col" className={head}>Status</th>
            <th scope="col" className={head}>Prioritas</th>
            <th scope="col" className={head}>Tenggat</th>
            <th scope="col" className={cn(head, 'text-right')}>Catatan</th>
          </tr>
        </thead>
        {groups ? (
          groups.map((group) => {
            const open = !collapsed.has(group.key)
            const Caret = open ? CaretDown : CaretRight
            return (
              <tbody key={group.key}>
                <tr className="border-b bg-sunken/30">
                  <th scope="rowgroup" colSpan={columns} className="px-3 py-1.5 text-left font-normal">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => onToggleGroup(group.key)}
                      className="flex items-center gap-2 rounded-chip text-sm font-medium"
                    >
                      <Caret aria-hidden size={14} />
                      {group.label}
                      <span className="tabular-nums text-muted">{group.tasks.length}</span>
                    </button>
                  </th>
                </tr>
                {open && group.tasks.map(row)}
              </tbody>
            )
          })
        ) : (
          <tbody>{tasks.map(row)}</tbody>
        )}
      </table>
    </div>
  )
}
