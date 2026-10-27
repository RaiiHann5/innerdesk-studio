import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckSquare, MagnifyingGlass } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { StoreGate } from '@/components/ui/StoreGate'
import { Tabs, panelId, tabId, type TabItem } from '@/components/ui/Tabs'
import { pruneSelection } from '@/lib/taskSelection'
import {
  EMPTY_FILTERS,
  filterTasks,
  groupTasks,
  isArchived,
  smartViewCounts,
  sortTasks,
  type GroupKey,
  type SortKey,
  type TaskFilters,
} from '@/lib/taskQuery'
import { projectProgress } from '@/lib/projectStats'
import { globalStatItems, projectStatItems } from '@/lib/taskStats'
import { useProjectStore, useTaskStore } from '@/stores/entities'
import { toastWithRetry } from '@/stores/retryToast'
import type { Project, Task, TaskStatus } from '@/types/domain'
import { ArchiveList } from './ArchiveList'
import { BulkBar } from './BulkBar'
import { SmartViewChips } from './SmartViewChips'
import { StatsRow } from './StatsRow'
import { TaskBoard } from './TaskBoard'
import { TaskDialog, type TaskDialogState } from './TaskDialog'
import { TaskMonth } from './TaskMonth'
import { TaskPanel } from './TaskPanel'
import { TaskTable } from './TaskTable'
import { TaskTimeline } from './TaskTimeline'
import { TaskToolbar } from './TaskToolbar'
import { archiveTasksWithUndo, bulkUpdate, deleteTasksWithUndo, placeInColumn } from './taskActions'

type View = 'kanban' | 'timeline' | 'table' | 'calendar'

const TABS: TabItem<View>[] = [
  { value: 'kanban', label: 'Kanban' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'table', label: 'Tabel' },
  { value: 'calendar', label: 'Kalender' },
]
const PREFIX = 'tasks'
const STORES = [useTaskStore, useProjectStore]
const isView = (v: string | null): v is View => TABS.some((t) => t.value === v)
const NONE: ReadonlySet<string> = new Set()

/** Stats, the smart-view chips, the view tabs with the toolbar, and four columns: the shape of the workspace. */
function WorkspaceSkeleton() {
  return (
    <div role="status" aria-label="Memuat" className="space-y-6">
      <Skeleton className="h-20 rounded-card" />
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-7 w-24" />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-8 w-72" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="min-w-60 flex-1 space-y-3">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-9" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Stats, smart views, view tabs, toolbar and the four task views. Scoped to one project when projectId is set. */
export function TaskWorkspace({ projectId }: { projectId?: string }) {
  return (
    <StoreGate stores={STORES} skeleton={<WorkspaceSkeleton />}>
      <Workspace projectId={projectId} />
    </StoreGate>
  )
}

function Workspace({ projectId }: { projectId?: string }) {
  const tasks = useTaskStore((s) => s.items)
  const projects = useProjectStore((s) => s.items)

  const [params, setParams] = useSearchParams()
  const raw = params.get('view')
  const view: View = isView(raw) ? raw : 'kanban'

  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS)
  const [sort, setSort] = useState<SortKey>('priority')
  const [group, setGroup] = useState<GroupKey | null>(null)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(NONE)
  const [selected, setSelected] = useState<ReadonlySet<string>>(NONE)
  const [dialog, setDialog] = useState<TaskDialogState | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const scoped = useMemo(() => (projectId ? tasks.filter((t) => t.projectId === projectId) : tasks), [tasks, projectId])
  const visible = useMemo(() => sortTasks(filterTasks(scoped, filters), sort), [scoped, filters, sort])
  const archived = useMemo(() => scoped.filter(isArchived), [scoped])
  const liveCount = scoped.length - archived.length
  const counts = useMemo(() => smartViewCounts(scoped), [scoped])
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])
  // Inside a project every card would repeat the same name, so it is left out there.
  const shownProjects = useMemo(() => (projectId ? new Map<string, Project>() : projectById), [projectId, projectById])
  // Inside a project the "Selesai" figure is the project's own progress, the one its card and Ringkasan show.
  const project = projectId ? projectById.get(projectId) : undefined
  const stats = projectId ? projectStatItems(scoped, project ? projectProgress(project, tasks).percent : undefined) : globalStatItems(tasks, projects)

  const groupOptions: GroupKey[] = view !== 'table' ? [] : projectId ? ['status', 'priority', 'due'] : ['status', 'priority', 'project', 'due']
  const groups = useMemo(() => (view === 'table' && group ? groupTasks(visible, group, projects) : null), [view, group, visible, projects])

  const openTask = openId ? tasks.find((t) => t.id === openId) : undefined
  const closePanel = useCallback(() => setOpenId(null), [])
  // A task that was deleted must not reopen the panel if the delete is undone later.
  useEffect(() => {
    if (openId && !openTask) setOpenId(null)
  }, [openId, openTask])

  // Selection only makes sense in the table, and only for rows that still exist and still match.
  useEffect(() => {
    setSelected((current) => (view !== 'table' ? (current.size ? NONE : current) : pruneSelection(current, visible.map((t) => t.id))))
  }, [view, visible])

  const selectedTasks = useMemo(() => visible.filter((t) => selected.has(t.id)), [visible, selected])

  const create = (status: TaskStatus = 'todo') => setDialog({ status, projectId })
  const open = (task: Task) => setOpenId(task.id)
  const move = (task: Task, status: TaskStatus, index: number) => {
    placeInColumn(task, status, index).catch(() => toastWithRetry('Task gagal dipindahkan.', () => placeInColumn(task, status, index)))
  }
  const changeGroup = (next: GroupKey | null) => {
    setGroup(next)
    setCollapsed(NONE)
  }
  const toggleGroup = (key: string) =>
    setCollapsed((current) => {
      const next = new Set(current)
      if (!next.delete(key)) next.add(key)
      return next
    })

  const body = () => {
    if (scoped.length === 0) {
      return (
        <EmptyState
          icon={CheckSquare}
          title="Belum ada task"
          description={projectId ? 'Tambahkan task pertama untuk project ini.' : 'Tambahkan task pertama, atau tekan Ctrl+K dan tulis judulnya.'}
          action={
            <Button variant="primary" onClick={() => create()}>
              Task baru
            </Button>
          }
        />
      )
    }
    if (liveCount === 0 && view !== 'kanban') {
      return <EmptyState icon={CheckSquare} title="Semua task diarsipkan" description="Buka Arsip di bawah untuk memulihkan, atau buat task baru." action={<Button onClick={() => create()}>Task baru</Button>} />
    }
    if (visible.length === 0 && liveCount > 0) {
      return (
        <EmptyState
          icon={MagnifyingGlass}
          title="Tidak ada task yang cocok"
          description="Ubah kata kunci, filter, atau tampilan cepat untuk melihat task lain."
          action={<Button onClick={() => setFilters(EMPTY_FILTERS)}>Atur ulang filter</Button>}
        />
      )
    }
    if (view === 'kanban')
      return <TaskBoard tasks={visible} allTasks={tasks} projectById={shownProjects} projectId={projectId} onOpen={open} onMove={move} onArchiveDone={(done) => void archiveTasksWithUndo(done)} />
    if (view === 'timeline') return <TaskTimeline tasks={visible} projectById={shownProjects} onOpen={open} />
    if (view === 'table')
      return (
        <div className="space-y-3">
          <BulkBar
            count={selectedTasks.length}
            projects={projects}
            onApply={(patchFor) => void bulkUpdate(selectedTasks, patchFor)}
            onArchive={() => void archiveTasksWithUndo(selectedTasks)}
            onDelete={() => void deleteTasksWithUndo(selectedTasks)}
            onClear={() => setSelected(NONE)}
          />
          <TaskTable
            tasks={visible}
            groups={groups}
            collapsed={collapsed}
            onToggleGroup={toggleGroup}
            selected={selected}
            onSelect={setSelected}
            projectById={projectById}
            showProject={!projectId}
            onOpen={open}
          />
        </div>
      )
    return <TaskMonth tasks={visible} onOpen={open} />
  }

  return (
    <div className="space-y-6">
      <StatsRow items={stats} label={projectId ? 'Ringkasan project' : 'Ringkasan task'} />
      <SmartViewChips value={filters.smart} counts={counts} onChange={(smart) => setFilters((f) => ({ ...f, smart }))} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          items={TABS}
          value={view}
          onChange={(next) =>
            // Keep the other params (a project's tab, for one) and change only the view.
            setParams(
              (current) => {
                const params = new URLSearchParams(current)
                if (next === 'kanban') params.delete('view')
                else params.set('view', next)
                return params
              },
              { replace: true },
            )
          }
          label="Tampilan task"
          idPrefix={PREFIX}
          tone="neutral"
        />
        <TaskToolbar
          filters={filters}
          onFilters={setFilters}
          sort={sort}
          onSort={setSort}
          projects={projectId ? [] : projects}
          onCreate={() => create()}
          showSort={view !== 'kanban'}
          groupOptions={groupOptions}
          group={group}
          onGroup={changeGroup}
        />
      </div>
      <div role="tabpanel" id={panelId(PREFIX, view)} aria-labelledby={tabId(PREFIX, view)} className="outline-offset-4">
        {body()}
      </div>
      {(view === 'kanban' || view === 'table') && <ArchiveList tasks={archived} projectById={projectById} onOpen={open} />}
      <TaskDialog state={dialog} projects={projects} onClose={() => setDialog(null)} />
      {openTask && <TaskPanel key={openTask.id} task={openTask} projects={projects} onClose={closePanel} />}
    </div>
  )
}
