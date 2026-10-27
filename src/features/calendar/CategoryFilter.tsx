import { Funnel } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Popover } from '@/components/ui/Popover'
import { cn } from '@/lib/cn'
import { CATEGORY_STYLE } from './categories'
import { useCategories } from './hooks/useCategories'
import { useCalendarStore } from './store'

export function CategoryFilter() {
  const { categories } = useCategories()
  const hidden = useCalendarStore((s) => s.hiddenCategoryIds)
  const showTasks = useCalendarStore((s) => s.showTasks)
  const toggleCategory = useCalendarStore((s) => s.toggleCategory)
  const setShowTasks = useCalendarStore((s) => s.setShowTasks)
  const activeFilters = hidden.length + (showTasks ? 0 : 1)

  return (
    <Popover
      label="Filter kalender"
      className="w-60"
      renderTrigger={(props) => (
        <Button {...props}>
          <Funnel aria-hidden />
          Filter
          {activeFilters > 0 && (
            <span className="rounded-chip bg-accent-soft px-1.5 text-xs font-medium tabular-nums text-accent-text">
              {activeFilters}
            </span>
          )}
        </Button>
      )}
    >
      <fieldset className="p-2">
        <legend className="px-2 pb-1 pt-2 text-xs text-muted">Tampilkan</legend>
        {categories.map((category) => (
          <FilterRow
            key={category.id}
            label={category.name}
            checked={!hidden.includes(category.id)}
            onChange={() => toggleCategory(category.id)}
            swatch={CATEGORY_STYLE[category.colorToken].bar}
          />
        ))}
        <div className="my-1 border-t" />
        <FilterRow label="Task dengan tenggat" checked={showTasks} onChange={() => setShowTasks(!showTasks)} />
      </fieldset>
    </Popover>
  )
}

interface FilterRowProps {
  label: string
  checked: boolean
  onChange: () => void
  swatch?: string
}

function FilterRow({ label, checked, onChange, swatch }: FilterRowProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-control px-2 py-1.5 text-sm hover:bg-sunken">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-4 accent-accent" />
      {swatch && <span aria-hidden className={cn('h-3.5 w-[3px] rounded-full', swatch)} />}
      {label}
    </label>
  )
}
