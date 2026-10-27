import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Archive } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { BOARD_STATUSES, describePlace, fullIndexFor, isBoardStatus, placeOf, previewMove, columnsFromTasks, type BoardColumns } from '@/lib/boardDrag'
import { cn } from '@/lib/cn'
import { STATUS_LABEL } from '@/lib/labels'
import { useMediaQuery } from '@/lib/useMediaQuery'
import type { Project, Task, TaskStatus } from '@/types/domain'
import { QuickAdd } from './QuickAdd'
import { StatusPill } from './StatusPill'
import { TaskCard } from './TaskCard'

const collision: CollisionDetection = (args) => {
  const pointer = pointerWithin(args)
  return pointer.length > 0 ? pointer : rectIntersection(args)
}

/** Left and right jump a lifted card to the neighbouring column. Up and down walk the cards, which reorders them. */
const boardCoordinates: KeyboardCoordinateGetter = (event, args) => {
  if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') return sortableKeyboardCoordinates(event, args)
  event.preventDefault()
  const {
    context: { droppableRects, droppableContainers, collisionRect },
  } = args
  if (!collisionRect) return undefined

  const columns = droppableContainers
    .getEnabled()
    .filter((c) => isBoardStatus(c.id))
    .flatMap((c) => {
      const rect = droppableRects.get(c.id)
      return rect ? [rect] : []
    })
    .sort((a, b) => a.left - b.left)
  if (columns.length === 0) return undefined

  const centerX = collisionRect.left + collisionRect.width / 2
  const current = Math.max(0, columns.findIndex((r) => centerX >= r.left && centerX <= r.right))
  const target = columns[Math.min(columns.length - 1, Math.max(0, current + (event.code === 'ArrowRight' ? 1 : -1)))]
  return { x: target.left + 8, y: target.top + 8 }
}

const INSTRUCTIONS =
  'Tekan Spasi untuk mengangkat task. Panah atas dan bawah mengubah urutan di kolom, panah kiri dan kanan pindah kolom. Spasi atau Enter untuk menjatuhkan, Escape untuk membatalkan. Tekan Enter untuk membuka task.'

interface TaskBoardProps {
  /** Filtered by the toolbar. The board orders them itself, by hand. */
  tasks: Task[]
  /** Every task in the store, so a position among filtered cards can be turned into a real one. */
  allTasks: Task[]
  projectById: Map<string, Project>
  projectId?: string
  onOpen: (task: Task) => void
  /** `index` is the position in the full column, hidden cards included. */
  onMove: (task: Task, status: TaskStatus, index: number) => void
  onArchiveDone: (tasks: Task[]) => void
}

export function TaskBoard({ tasks, allTasks, projectById, projectId, onOpen, onMove, onArchiveDone }: TaskBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  // While a card is held, the columns are rearranged here so the others make room. Nothing is saved until it drops.
  const [preview, setPreview] = useState<BoardColumns | null>(null)
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  const base = useMemo(() => columnsFromTasks(tasks), [tasks])
  const columns = preview ?? base
  const columnsRef = useRef(columns)
  columnsRef.current = columns
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const active = activeId ? (taskById.get(activeId) ?? null) : null

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    // Space lifts a card; Enter is kept free so it can open the task.
    useSensor(KeyboardSensor, { coordinateGetter: boardCoordinates, keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] } }),
  )

  const titleOf = (id: string | number) => taskById.get(String(id))?.title ?? 'task'
  const announcements: Announcements = {
    onDragStart: ({ active: a }) => `Task ${titleOf(a.id)} diangkat dari kolom ${STATUS_LABEL[placeOf(base, String(a.id))?.status ?? 'todo']}.`,
    onDragOver: ({ active: a, over }) =>
      over ? describePlace(titleOf(a.id), placeOf(previewMove(columnsRef.current, String(a.id), String(over.id)), String(a.id))) : undefined,
    onDragEnd: ({ active: a, over }) =>
      over
        ? `Dijatuhkan. ${describePlace(titleOf(a.id), placeOf(previewMove(columnsRef.current, String(a.id), String(over.id)), String(a.id)))}`
        : `Task ${titleOf(a.id)} dilepas di tempat semula.`,
    onDragCancel: ({ active: a }) => `Pemindahan task ${titleOf(a.id)} dibatalkan.`,
  }

  const reset = () => {
    setActiveId(null)
    setPreview(null)
  }
  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id))
    setPreview(base)
  }
  const onDragOver = ({ active: a, over }: DragOverEvent) => {
    if (over) setPreview((current) => previewMove(current ?? base, String(a.id), String(over.id)))
  }
  const onDragEnd = ({ active: a, over }: DragEndEvent) => {
    const id = String(a.id)
    const final = over ? previewMove(columnsRef.current, id, String(over.id)) : columnsRef.current
    const task = taskById.get(id)
    const place = placeOf(final, id)
    const before = placeOf(base, id)
    reset()
    if (!task || !place || (before && before.status === place.status && before.index === place.index)) return
    onMove(task, place.status, fullIndexFor(allTasks, id, final, place.status))
  }

  const doneTasks = tasks.filter((t) => t.status === 'done')

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={reset}
      accessibility={{ announcements, screenReaderInstructions: { draggable: INSTRUCTIONS } }}
    >
      <div className="relative flex items-stretch gap-4 overflow-x-auto pb-2">
        {BOARD_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            ids={columns[status]}
            taskById={taskById}
            projectById={projectById}
            projectId={projectId}
            reduceMotion={reduceMotion}
            onOpen={onOpen}
            onArchiveDone={status === 'done' && doneTasks.length > 0 ? () => onArchiveDone(doneTasks) : undefined}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={reduceMotion ? null : { duration: 160, easing: 'ease-out' }}>
        {active && (
          <div className="rotate-2 cursor-grabbing rounded-card shadow-lift">
            <TaskCard task={active} project={active.projectId ? projectById.get(active.projectId) : undefined} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

interface ColumnProps {
  status: TaskStatus
  ids: string[]
  taskById: Map<string, Task>
  projectById: Map<string, Project>
  projectId?: string
  reduceMotion: boolean
  onOpen: (task: Task) => void
  onArchiveDone?: () => void
}

function Column({ status, ids, taskById, projectById, projectId, reduceMotion, onOpen, onArchiveDone }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <section aria-label={STATUS_LABEL[status]} className="flex w-72 shrink-0 flex-col lg:w-auto lg:min-w-60 lg:flex-1">
      <div className="flex h-8 items-center justify-between gap-2">
        <StatusPill status={status} count={ids.length} />
        {onArchiveDone && (
          <Button variant="ghost" onClick={onArchiveDone} className="h-7 px-2">
            <Archive aria-hidden size={14} />
            Arsipkan selesai
          </Button>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={cn('-mx-1 mt-3 flex min-h-40 flex-1 flex-col gap-3 rounded-card p-1 transition-colors duration-fast', isOver && 'bg-sunken')}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {ids.map((id) => {
            const task = taskById.get(id)
            return task && <SortableTask key={id} task={task} project={task.projectId ? projectById.get(task.projectId) : undefined} reduceMotion={reduceMotion} onOpen={onOpen} />
          })}
        </SortableContext>
        {ids.length === 0 && <p className="rounded-card border border-dashed p-4 text-center text-sm text-muted">Belum ada task</p>}
        <QuickAdd status={status} projectId={projectId} />
      </div>
    </section>
  )
}

interface SortableTaskProps {
  task: Task
  project?: Project
  reduceMotion: boolean
  onOpen: (task: Task) => void
}

function SortableTask({ task, project, reduceMotion, onOpen }: SortableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    listeners?.onKeyDown?.(e)
    if (e.key === 'Enter' && !isDragging) {
      // Without this the same Enter lands on the panel's focused title field.
      e.preventDefault()
      onOpen(task)
    }
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onKeyDown={onKeyDown}
      onClick={() => onOpen(task)}
      style={{ transform: CSS.Translate.toString(transform), transition: reduceMotion ? undefined : transition }}
      className={cn('cursor-grab rounded-card', isDragging && 'opacity-40')}
    >
      <TaskCard task={task} project={project} />
    </div>
  )
}
