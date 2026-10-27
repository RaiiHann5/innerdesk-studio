import { Flag, Square } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { CATEGORY_STYLE } from './categories'
import { useCategories } from './hooks/useCategories'
import { useCalendarFilters } from './hooks/useAgenda'
import { useCalendarStore } from './store'

/**
 * The legend doubles as the filter: every category and the tasks toggle write to the same store the
 * toolbar filter uses, so the two stay in step and the choice survives a reload.
 */
export function CategoryLegend() {
  const { categories } = useCategories()
  const { hiddenCategoryIds, showTasks, showMilestones } = useCalendarFilters()
  const toggleCategory = useCalendarStore((s) => s.toggleCategory)
  const setShowTasks = useCalendarStore((s) => s.setShowTasks)
  const setShowMilestones = useCalendarStore((s) => s.setShowMilestones)

  return (
    <section aria-label="Legenda kategori" className="space-y-1.5">
      <h3 className="text-base font-bold">Legenda</h3>
      <ul className="space-y-0.5">
        {categories.map((category) => {
          const on = !hiddenCategoryIds.includes(category.id)
          return (
            <li key={category.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggleCategory(category.id)}
                className="flex w-full items-center gap-2.5 rounded-control px-2 py-1 text-left text-sm transition-colors duration-fast hover:bg-sunken"
              >
                <Square size={14} weight={on ? 'fill' : 'regular'} aria-hidden className={on ? 'text-ink' : 'text-faint'} />
                <span aria-hidden className={cn('h-3.5 w-[3px] shrink-0 rounded-full', CATEGORY_STYLE[category.colorToken].bar)} />
                <span className={cn('min-w-0 flex-1 truncate', !on && 'text-muted')}>{category.name}</span>
              </button>
            </li>
          )
        })}
        <li>
          <button
            type="button"
            role="checkbox"
            aria-checked={showTasks}
            onClick={() => setShowTasks(!showTasks)}
            className="flex w-full items-center gap-2.5 rounded-control px-2 py-1 text-left text-sm transition-colors duration-fast hover:bg-sunken"
          >
            <Square size={14} weight={showTasks ? 'fill' : 'regular'} aria-hidden className={showTasks ? 'text-ink' : 'text-faint'} />
            <span aria-hidden className="h-3.5 w-[3px] shrink-0 rounded-full bg-ink" />
            <span className={cn('min-w-0 flex-1 truncate', !showTasks && 'text-muted')}>Task bertenggat</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            role="checkbox"
            aria-checked={showMilestones}
            onClick={() => setShowMilestones(!showMilestones)}
            className="flex w-full items-center gap-2.5 rounded-control px-2 py-1 text-left text-sm transition-colors duration-fast hover:bg-sunken"
          >
            <Square size={14} weight={showMilestones ? 'fill' : 'regular'} aria-hidden className={showMilestones ? 'text-ink' : 'text-faint'} />
            <Flag size={14} aria-hidden className="shrink-0 text-muted" />
            <span className={cn('min-w-0 flex-1 truncate', !showMilestones && 'text-muted')}>Milestone project</span>
          </button>
        </li>
      </ul>
    </section>
  )
}