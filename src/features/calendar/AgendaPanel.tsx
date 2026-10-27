import { CheckSquare, Flag, MapPin, Repeat, Square } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { isSameDay } from 'date-fns'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/date'
import { useProjectStore } from '@/stores/entities'
import { CATEGORY_STYLE } from './categories'
import { openOccurrence } from './editor/eventActions'
import { agendaEntries, useAgenda, useCalendarFilters, type AgendaEntry } from './hooks/useAgenda'
import { useCategories } from './hooks/useCategories'
import type { Occurrence } from './lib/recurrence'

interface AgendaPanelProps {
  focused: Date
  /** Opens the task on the tasks page. */
  onOpenTask: (taskId: string) => void
}

const minutesToHHMM = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/**
 * Everything on the focused date: all-day first, then events and timed tasks in clock order.
 *
 * It reads the same day map as the grid and the month cells, and applies the same filters, so a
 * hidden category or a hidden task disappears from here at the same moment it disappears elsewhere.
 */
export function AgendaPanel({ focused, onOpenTask }: AgendaPanelProps) {
  const { hiddenCategoryIds, showTasks, showMilestones } = useCalendarFilters()
  const { categories } = useCategories()
  const projects = useProjectStore((s) => s.items)
  const items = useAgenda(focused, hiddenCategoryIds, showTasks, showMilestones)
  const entries = agendaEntries(items)
  const projectNames = new Map(projects.map((p) => [p.id, p.name]))
  const heading = isSameDay(focused, new Date()) ? 'Agenda hari ini' : 'Agenda'

  return (
    <section aria-label="Agenda" className="space-y-2">
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-bold">{heading}</h3>
        <span className="text-xs text-muted">{fmt(focused, 'EEEE, d MMM')}</span>
      </header>

      {entries.length === 0 ? (
        <p className="rounded-control border border-dashed px-3 py-4 text-center text-sm text-muted">
          Tidak ada apa-apa di tanggal ini.
        </p>
      ) : (
        <ol className="space-y-0.5">
          {entries.map((entry) => (
            <li key={`${entry.kind}-${entry.key}`}>
              <AgendaRow entry={entry} categories={categories} projectNames={projectNames} onOpenTask={onOpenTask} />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

interface AgendaRowProps {
  entry: AgendaEntry
  categories: ReturnType<typeof useCategories>['categories']
  projectNames: Map<string, string>
  onOpenTask: (taskId: string) => void
}

function AgendaRow({ entry, categories, projectNames, onOpenTask }: AgendaRowProps) {
  if (entry.kind === 'task') {
    return (
      <button
        type="button"
        onClick={() => onOpenTask(entry.timed.task.id)}
        className="flex w-full items-start gap-2 rounded-control px-2 py-1.5 text-left transition-colors duration-fast hover:bg-sunken"
      >
        <Time when={minutesToHHMM(entry.timed.minutes)} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <TaskBox done={entry.timed.task.status === 'done'} />
            <span className={cn('truncate text-sm', entry.timed.task.status === 'done' && 'text-muted line-through')}>
              {entry.timed.task.title}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted">
            Task · {projectNames.get(entry.timed.task.projectId ?? '') ?? 'tanpa project'}
          </span>
        </span>
      </button>
    )
  }

  if (entry.kind === 'taskAllDay') {
    return (
      <button
        type="button"
        onClick={() => onOpenTask(entry.task.id)}
        className="flex w-full items-start gap-2 rounded-control px-2 py-1.5 text-left transition-colors duration-fast hover:bg-sunken"
      >
        <Time when="sehari" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <TaskBox done={entry.task.status === 'done'} />
            <span className={cn('truncate text-sm', entry.task.status === 'done' && 'text-muted line-through')}>{entry.task.title}</span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted">
            Task · {projectNames.get(entry.task.projectId ?? '') ?? 'tanpa project'}
          </span>
        </span>
      </button>
    )
  }

  if (entry.kind === 'milestone') {
    const { milestone, project } = entry.item
    return (
      <Link
        to={`/projects/${project.id}`}
        className="flex w-full items-start gap-2 rounded-control px-2 py-1.5 text-left transition-colors duration-fast hover:bg-sunken"
      >
        <Time when="sehari" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className={cn('h-3.5 w-[3px] shrink-0 rounded-full', CATEGORY_STYLE[project.color].bar)} />
            <Flag size={14} weight={milestone.done ? 'fill' : 'regular'} aria-hidden className="shrink-0 text-muted" />
            <span className={cn('truncate text-sm', milestone.done && 'text-muted line-through')}>{milestone.title}</span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted">Milestone · {project.name}</span>
        </span>
      </Link>
    )
  }

  const occurrence: Occurrence = entry.occurrence
  const { event } = occurrence
  const category = categories.find((c) => c.id === event.categoryId)
  const color = category ? CATEGORY_STYLE[category.colorToken] : null
  const when = entry.kind === 'allDay' ? 'sehari' : `${fmt(occurrence.start, 'HH:mm')} - ${fmt(occurrence.end, 'HH:mm')}`

  return (
    <button
      type="button"
      onClick={() => openOccurrence(occurrence)}
      className={cn(
        'flex w-full items-start gap-2 rounded-control py-1.5 pl-2 pr-2 text-left transition-[filter] duration-fast hover:brightness-95',
        color?.tint ?? 'bg-sunken',
      )}
    >
      <Time when={when} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className={cn('h-3.5 w-[3px] shrink-0 rounded-full', color?.bar ?? 'bg-faint')} />
          <span className="truncate text-sm font-medium">{event.title}</span>
          {occurrence.isRecurring && <Repeat size={12} aria-label="Berulang" className="shrink-0 text-muted" />}
        </span>
        {(event.location || category) && (
          <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            {event.location ? (
              <>
                <MapPin size={11} aria-hidden className="shrink-0" />
                <span className="truncate">{event.location}</span>
              </>
            ) : (
              <span className="truncate">{category?.name}</span>
            )}
          </span>
        )}
      </span>
    </button>
  )
}

const Time = ({ when }: { when: string }) => <span className="w-[4.5rem] shrink-0 pt-px text-xs tabular-nums text-muted">{when}</span>

const TaskBox = ({ done }: { done: boolean }) =>
  done ? <CheckSquare size={13} weight="fill" aria-label="Selesai" className="shrink-0 text-muted" /> : <Square size={13} aria-hidden className="shrink-0 text-muted" />