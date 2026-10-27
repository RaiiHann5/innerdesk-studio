import { ArrowsDownUp, Funnel, MagnifyingGlass, Plus, Rows } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { controlClass } from '@/components/ui/Field'
import { Popover } from '@/components/ui/Popover'
import { cn } from '@/lib/cn'
import { PRIORITY_LABEL } from '@/lib/labels'
import {
  DUE_LABEL,
  EMPTY_FILTERS,
  GROUP_LABEL,
  SORT_LABEL,
  countActiveFilters,
  type DueFilter,
  type GroupKey,
  type SortKey,
  type TaskFilters,
} from '@/lib/taskQuery'
import type { Priority, Project } from '@/types/domain'

interface TaskToolbarProps {
  filters: TaskFilters
  onFilters: (next: TaskFilters) => void
  sort: SortKey
  onSort: (next: SortKey) => void
  /** Projects offered in the filter. Pass an empty list to hide the project filter. */
  projects: Project[]
  onCreate: () => void
  /** The board is ordered by hand, so it has no sort. Table, timeline and calendar do. */
  showSort: boolean
  /** Grouping applies to the table only. Leave `groupOptions` empty to hide it. */
  groupOptions: GroupKey[]
  group: GroupKey | null
  onGroup: (next: GroupKey | null) => void
}

const PRIORITIES = Object.keys(PRIORITY_LABEL) as Priority[]
const DUE_OPTIONS = Object.keys(DUE_LABEL) as DueFilter[]
const SORT_OPTIONS = Object.keys(SORT_LABEL) as SortKey[]

const optionClass = 'flex h-8 cursor-pointer items-center gap-2 rounded-control px-2 text-base hover:bg-sunken'
const popoverPosition = 'left-0 right-auto w-64 md:left-auto md:right-0'

export function TaskToolbar({ filters, onFilters, sort, onSort, projects, onCreate, showSort, groupOptions, group, onGroup }: TaskToolbarProps) {
  const active = countActiveFilters(filters)

  const togglePriority = (p: Priority) =>
    onFilters({
      ...filters,
      priorities: filters.priorities.includes(p) ? filters.priorities.filter((x) => x !== p) : [...filters.priorities, p],
    })

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative w-full sm:w-auto">
        <span className="sr-only">Cari task</span>
        <MagnifyingGlass aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={filters.query}
          onChange={(e) => onFilters({ ...filters, query: e.target.value })}
          placeholder="Cari task"
          className={cn(controlClass, 'pl-8 sm:w-52')}
        />
      </label>

      <Popover
        label="Filter task"
        className={popoverPosition}
        renderTrigger={(props) => (
          <Button {...props}>
            <Funnel aria-hidden />
            Filter
            {active > 0 && (
              <span className="rounded-full bg-ink px-1.5 text-xs tabular-nums text-bg">
                <span className="sr-only">Aktif: </span>
                {active}
              </span>
            )}
          </Button>
        )}
      >
        <div className="space-y-4 p-3">
          <fieldset>
            <legend className="px-2 text-sm font-medium">Prioritas</legend>
            {PRIORITIES.map((p) => (
              <label key={p} className={optionClass}>
                <input
                  type="checkbox"
                  checked={filters.priorities.includes(p)}
                  onChange={() => togglePriority(p)}
                  className="size-4 accent-[rgb(var(--accent-text))]"
                />
                {PRIORITY_LABEL[p]}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend className="px-2 text-sm font-medium">Tenggat</legend>
            {DUE_OPTIONS.map((d) => (
              <label key={d} className={optionClass}>
                <input
                  type="radio"
                  name="due-filter"
                  checked={filters.due === d}
                  onChange={() => onFilters({ ...filters, due: d })}
                  className="size-4 accent-[rgb(var(--accent-text))]"
                />
                {DUE_LABEL[d]}
              </label>
            ))}
          </fieldset>

          {projects.length > 0 && (
            <div className="space-y-1.5 px-2">
              <label htmlFor="project-filter" className="text-sm font-medium">
                Project
              </label>
              <select
                id="project-filter"
                value={filters.projectId}
                onChange={(e) => onFilters({ ...filters, projectId: e.target.value })}
                className={controlClass}
              >
                <option value="all">Semua project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            variant="ghost"
            disabled={active === 0}
            onClick={() => onFilters({ ...EMPTY_FILTERS, query: filters.query, smart: filters.smart })}
            className="w-full"
          >
            Atur ulang filter
          </Button>
        </div>
      </Popover>

      {groupOptions.length > 0 && (
        <Popover
          label="Kelompokkan task"
          className={popoverPosition}
          renderTrigger={(props) => (
            <Button {...props}>
              <Rows aria-hidden />
              Kelompokkan
              {group && <span className="hidden font-normal text-muted md:inline">{GROUP_LABEL[group]}</span>}
            </Button>
          )}
        >
          <fieldset className="p-3">
            <legend className="px-2 text-sm font-medium">Kelompokkan berdasarkan</legend>
            {[null, ...groupOptions].map((key) => (
              <label key={key ?? 'none'} className={optionClass}>
                <input
                  type="radio"
                  name="task-group"
                  checked={group === key}
                  onChange={() => onGroup(key)}
                  className="size-4 accent-[rgb(var(--accent-text))]"
                />
                {key ? GROUP_LABEL[key] : 'Tanpa kelompok'}
              </label>
            ))}
          </fieldset>
        </Popover>
      )}

      {showSort && (
        <Popover
          label="Urutkan task"
          className={popoverPosition}
          renderTrigger={(props) => (
            <Button {...props}>
              <ArrowsDownUp aria-hidden />
              Urutkan
              <span className="hidden font-normal text-muted md:inline">{SORT_LABEL[sort]}</span>
            </Button>
          )}
        >
          <fieldset className="p-3">
            <legend className="px-2 text-sm font-medium">Urutkan berdasarkan</legend>
            {SORT_OPTIONS.map((key) => (
              <label key={key} className={optionClass}>
                <input
                  type="radio"
                  name="task-sort"
                  checked={sort === key}
                  onChange={() => onSort(key)}
                  className="size-4 accent-[rgb(var(--accent-text))]"
                />
                {SORT_LABEL[key]}
              </label>
            ))}
          </fieldset>
        </Popover>
      )}

      <Button variant="primary" onClick={onCreate} className="ml-auto">
        <Plus aria-hidden />
        Task baru
      </Button>
    </div>
  )
}
