import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MagnifyingGlass, Plus } from '@phosphor-icons/react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { controlClass } from '@/components/ui/Field'
import { PageHero } from '@/components/ui/PageHero'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StoreGate } from '@/components/ui/StoreGate'
import { Tabs, panelId, tabId, type TabItem } from '@/components/ui/Tabs'
import { StatsRow } from '@/features/tasks/StatsRow'
import { cn } from '@/lib/cn'
import { PROJECT_STATUS_LABEL } from '@/lib/labels'
import { filterProjects, isArchivedProject, sortProjectRows, type ProjectSortKey, type SortDirection } from '@/lib/projectList'
import { projectSummary } from '@/lib/projectStats'
import { globalStatItems } from '@/lib/taskStats'
import { useProjectStore, useTaskStore } from '@/stores/entities'
import type { ProjectStatus } from '@/types/domain'
import { ArchivedProjects } from './ArchivedProjects'
import { ProjectBoard } from './ProjectBoard'
import { ProjectDialog } from './ProjectDialog'
import { ProjectList } from './ProjectList'
import { ProjectsSkeleton } from './skeletons'

type StatusFilter = 'all' | ProjectStatus
type View = 'papan' | 'daftar' | 'arsip'

const PREFIX = 'projects'
const isView = (v: string | null): v is View => v === 'papan' || v === 'daftar' || v === 'arsip'

const STORES = [useProjectStore, useTaskStore]
const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Semua' },
  ...(Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]).map((value) => ({ value, label: PROJECT_STATUS_LABEL[value] })),
]

function Content() {
  const projects = useProjectStore((s) => s.items)
  const tasks = useTaskStore((s) => s.items)
  const [params, setParams] = useSearchParams()
  const raw = params.get('view')
  const view: View = isView(raw) ? raw : 'papan'
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<ProjectSortKey>('deadline')
  const [direction, setDirection] = useState<SortDirection>('asc')
  const [creating, setCreating] = useState(false)

  const active = useMemo(() => projects.filter((p) => !isArchivedProject(p)), [projects])
  const archived = useMemo(() => projects.filter(isArchivedProject), [projects])
  const visible = useMemo(() => filterProjects(active, { query, status }), [active, query, status])
  const visibleArchived = useMemo(() => filterProjects(archived, { query, status }), [archived, query, status])
  // The board keeps its order by deadline; the list sorts however its headers say.
  const boardOrder = useMemo(
    () => [...visible].sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999')),
    [visible],
  )
  const rows = useMemo(
    () => sortProjectRows(visible.map((project) => ({ project, summary: projectSummary(project, tasks) })), sortKey, direction),
    [visible, tasks, sortKey, direction],
  )

  const tabs: TabItem<View>[] = [
    { value: 'papan', label: 'Papan' },
    { value: 'daftar', label: 'Daftar' },
    { value: 'arsip', label: 'Arsip', count: archived.length || undefined },
  ]
  const sortBy = (key: ProjectSortKey) => {
    if (key === sortKey) setDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setDirection(key === 'progress' ? 'desc' : 'asc')
    }
  }

  return (
    <div className="space-y-6">
      <StatsRow items={globalStatItems(tasks, projects)} label="Ringkasan project" />
      <div className="space-y-3">
        <Tabs
          items={tabs}
          value={view}
          onChange={(next) => setParams(next === 'papan' ? {} : { view: next }, { replace: true })}
          label="Tampilan project"
          idPrefix={PREFIX}
          tone="neutral"
          actions={
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus aria-hidden />
              Project baru
            </Button>
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative w-full sm:w-auto">
            <span className="sr-only">Cari project</span>
            <MagnifyingGlass aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari project"
              className={cn(controlClass, 'pl-8 sm:w-52')}
            />
          </label>
          <SegmentedControl options={STATUS_OPTIONS} value={status} onChange={setStatus} label="Status project" />
        </div>
      </div>
      <div role="tabpanel" id={panelId(PREFIX, view)} aria-labelledby={tabId(PREFIX, view)} className="outline-offset-4">
        {view === 'arsip' ? (
          <ArchivedProjects projects={visibleArchived} hasAny={archived.length > 0} />
        ) : view === 'daftar' && rows.length > 0 ? (
          <ProjectList rows={rows} sortKey={sortKey} direction={direction} onSort={sortBy} />
        ) : (
          <ProjectBoard projects={boardOrder} tasks={tasks} hasAny={active.length > 0} />
        )}
      </div>
      <ProjectDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}

export default function ProjectsPage() {
  return (
    <Page>
      <PageHero title="Project" description="Semua project dan kemajuannya." art="sunrise" band="top" flip />
      <StoreGate stores={STORES} skeleton={<ProjectsSkeleton />}>
        <Content />
      </StoreGate>
    </Page>
  )
}
