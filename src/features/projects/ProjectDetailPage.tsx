import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowCounterClockwise, CalendarBlank, CaretLeft, FolderSimple, PencilSimple } from '@phosphor-icons/react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { HeroButton, PageHero } from '@/components/ui/PageHero'
import { StoreGate } from '@/components/ui/StoreGate'
import { Tabs, panelId, tabId, type TabItem } from '@/components/ui/Tabs'
import { TaskWorkspace } from '@/features/tasks/TaskWorkspace'
import { cn } from '@/lib/cn'
import { dueLabelInline, isOverdue } from '@/lib/date'
import { PROJECT_STATUS_LABEL } from '@/lib/labels'
import { PHASE_LABEL } from '@/lib/projectPhase'
import { summarizeTasks } from '@/lib/taskStats'
import { useNoteStore, useProjectStore, useTaskStore } from '@/stores/entities'
import { toastWithRetry } from '@/stores/retryToast'
import type { ProjectStatus } from '@/types/domain'
import { ProjectDialog } from './ProjectDialog'
import { ProjectLinks } from './ProjectLinks'
import { ProjectNotes } from './ProjectNotes'
import { ProjectOverview } from './ProjectOverview'
import { unarchiveProject } from './projectActions'
import { ProjectDetailSkeleton } from './skeletons'

type Tab = 'ringkasan' | 'task' | 'catatan' | 'tautan'

const PREFIX = 'project'
const STORES = [useProjectStore, useTaskStore, useNoteStore]
const isTab = (v: string | null): v is Tab => v === 'ringkasan' || v === 'task' || v === 'catatan' || v === 'tautan'
const STATUS_DOT: Record<ProjectStatus, string> = { active: 'bg-status-doing', paused: 'bg-status-review', done: 'bg-status-done' }

function BackLink() {
  return (
    <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-muted transition-colors duration-fast hover:text-ink">
      <CaretLeft aria-hidden size={14} />
      Semua project
    </Link>
  )
}

function Detail({ id }: { id: string }) {
  const project = useProjectStore((s) => s.items.find((p) => p.id === id))
  const tasks = useTaskStore((s) => s.items)
  const notes = useNoteStore((s) => s.items)
  const [editing, setEditing] = useState(false)
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: Tab = isTab(raw) ? raw : 'ringkasan'

  const ownTasks = useMemo(() => tasks.filter((t) => t.projectId === id), [tasks, id])
  const noteCount = useMemo(() => notes.filter((n) => n.projectId === id && !n.archivedAt).length, [notes, id])

  if (!project) {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState
          icon={FolderSimple}
          title="Project tidak ditemukan"
          description="Project ini mungkin sudah dihapus atau tautannya salah."
          action={
            <Link to="/projects">
              <Button>Lihat semua project</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const overdue = !!project.deadline && project.status !== 'done' && isOverdue(project.deadline)
  const tabs: TabItem<Tab>[] = [
    { value: 'ringkasan', label: 'Ringkasan' },
    { value: 'task', label: 'Task', count: summarizeTasks(ownTasks).total },
    { value: 'catatan', label: 'Catatan', count: noteCount },
    { value: 'tautan', label: 'Tautan', count: project.links.length },
  ]

  return (
    <>
      <div className="space-y-3">
        <BackLink />
        <PageHero
          title={project.name}
          description={project.description}
          art="sunrise"
          band="top"
          flip
          eyebrow="Project"
          actions={
            <HeroButton variant="primary" onClick={() => setEditing(true)}>
              <PencilSimple aria-hidden />
              Ubah project
            </HeroButton>
          }
        />
        <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className={cn('size-1.5 rounded-full', STATUS_DOT[project.status])} />
            {PROJECT_STATUS_LABEL[project.status]}
          </span>
          <span>Fase {PHASE_LABEL[project.phase].toLowerCase()}</span>
          <span className={cn('flex items-center gap-1.5 tabular-nums', overdue && 'font-medium text-status-overdue')}>
            <CalendarBlank aria-hidden size={14} />
            {project.deadline ? `Tenggat ${dueLabelInline(project.deadline)}` : 'Tanpa tenggat'}
          </span>
        </p>
      </div>
      {project.archivedAt && (
        <p className="flex items-center justify-between gap-3 rounded-card border bg-sunken/50 px-4 py-3 text-sm">
          <span>Project ini diarsipkan. Ia tidak tampil di papan, daftar, dan dashboard.</span>
          <Button onClick={() => unarchiveProject(project).catch(() => toastWithRetry('Project gagal dipulihkan.', () => unarchiveProject(project)))}>
            <ArrowCounterClockwise aria-hidden />
            Pulihkan
          </Button>
        </p>
      )}
      <Tabs
        items={tabs}
        value={tab}
        onChange={(next) =>
          setParams(
            (current) => {
              const params = new URLSearchParams(current)
              if (next === 'ringkasan') params.delete('tab')
              else params.set('tab', next)
              // The task tab's own view choice belongs to that tab, so it is dropped when leaving it.
              if (next !== 'task') params.delete('view')
              return params
            },
            { replace: true },
          )
        }
        label="Bagian project"
        idPrefix={PREFIX}
      />
      <div role="tabpanel" id={panelId(PREFIX, tab)} aria-labelledby={tabId(PREFIX, tab)} className="outline-offset-4">
        {tab === 'ringkasan' && <ProjectOverview project={project} tasks={ownTasks} />}
        {tab === 'task' && <TaskWorkspace projectId={project.id} />}
        {tab === 'catatan' && <ProjectNotes projectId={project.id} />}
        {tab === 'tautan' && <ProjectLinks project={project} />}
      </div>
      <ProjectDialog open={editing} project={project} onClose={() => setEditing(false)} />
    </>
  )
}

export default function ProjectDetailPage() {
  const { id = '' } = useParams()
  return (
    <Page>
      <StoreGate stores={STORES} skeleton={<ProjectDetailSkeleton />}>
        <Detail key={id} id={id} />
      </StoreGate>
    </Page>
  )
}
