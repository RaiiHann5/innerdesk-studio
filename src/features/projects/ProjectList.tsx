import { Link } from 'react-router-dom'
import { CaretDown, CaretUp } from '@phosphor-icons/react'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/cn'
import { dueLabelInline, isOverdue } from '@/lib/date'
import { PHASE_LABEL } from '@/lib/projectPhase'
import type { ProjectRow, ProjectSortKey, SortDirection } from '@/lib/projectList'
import { HEALTH_LABEL } from '@/lib/projectStats'
import { PROJECT_STATUS_LABEL } from '@/lib/labels'
import { ProjectDot } from './projectUi'

interface ProjectListProps {
  rows: ProjectRow[]
  sortKey: ProjectSortKey
  direction: SortDirection
  onSort: (key: ProjectSortKey) => void
}

const COLUMNS: Array<{ key: ProjectSortKey; label: string; className?: string }> = [
  { key: 'name', label: 'Project' },
  { key: 'phase', label: 'Fase' },
  { key: 'progress', label: 'Progres', className: 'w-48' },
  { key: 'health', label: 'Kesehatan' },
  { key: 'deadline', label: 'Tenggat' },
]

const cell = 'px-3 py-2.5 align-middle'

/** The project list as a table. Each header sorts; pressing the active one flips the direction. */
export function ProjectList({ rows, sortKey, direction, onSort }: ProjectListProps) {
  return (
    <div className="overflow-x-auto rounded-card border bg-surface">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <caption className="sr-only">Daftar project. Tekan judul kolom untuk mengurutkan.</caption>
        <thead className="border-b bg-sunken/50">
          <tr>
            {COLUMNS.map((c) => {
              const active = c.key === sortKey
              const Caret = direction === 'asc' ? CaretUp : CaretDown
              return (
                <th key={c.key} scope="col" aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'} className={cn('px-3 py-2 text-left text-xs font-medium text-muted', c.className)}>
                  <button type="button" onClick={() => onSort(c.key)} className={cn('inline-flex items-center gap-1 rounded-chip', active && 'text-ink')}>
                    {c.label}
                    {active && <Caret aria-hidden size={12} />}
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ project, summary }) => {
            const late = !!project.deadline && project.status !== 'done' && isOverdue(project.deadline)
            const { health, progress } = summary
            return (
              <tr key={project.id} className="border-b last:border-b-0 hover:bg-sunken/40">
                <td className={cn(cell, 'max-w-72')}>
                  <Link to={`/projects/${project.id}`} className="block min-w-0 rounded-chip">
                    <span className="flex items-center gap-2 font-medium">
                      <ProjectDot color={project.color} />
                      <span className="truncate hover:underline">{project.name}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">{PROJECT_STATUS_LABEL[project.status]}</span>
                  </Link>
                </td>
                <td className={cn(cell, 'whitespace-nowrap')}>{PHASE_LABEL[project.phase]}</td>
                <td className={cell}>
                  <div className="flex items-center gap-2">
                    <ProgressBar value={progress.percent} label={`Progres ${project.name}`} className="flex-1" />
                    <span className="w-9 text-right text-xs font-medium tabular-nums">{progress.percent}%</span>
                  </div>
                </td>
                <td className={cn(cell, 'max-w-56')}>
                  {health.level === 'sehat' ? (
                    <span className="text-muted">{HEALTH_LABEL.sehat}</span>
                  ) : (
                    <span className={cn('block', health.level === 'berisiko' && 'text-status-overdue')}>
                      <span className="font-medium">{HEALTH_LABEL[health.level]}</span>
                      <span className="block truncate text-xs text-muted">{health.reason}</span>
                    </span>
                  )}
                </td>
                <td className={cn(cell, 'whitespace-nowrap tabular-nums', late ? 'font-medium text-status-overdue' : 'text-muted')}>
                  {project.deadline ? (
                    <>
                      {late && <span className="sr-only">Terlambat, </span>}
                      {dueLabelInline(project.deadline)}
                    </>
                  ) : (
                    'Tanpa tenggat'
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
