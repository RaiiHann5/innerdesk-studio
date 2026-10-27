import { cn } from '@/lib/cn'
import { SMART_VIEWS, SMART_VIEW_LABEL, type SmartView } from '@/lib/taskQuery'

interface SmartViewChipsProps {
  value: SmartView | null
  counts: Record<SmartView, number>
  onChange: (next: SmartView | null) => void
}

/** One-tap views. Pressing the active one turns it off. They combine with search and the filter popover. */
export function SmartViewChips({ value, counts, onChange }: SmartViewChipsProps) {
  return (
    <div role="group" aria-label="Tampilan cepat" className="flex flex-wrap gap-2">
      {SMART_VIEWS.map((view) => {
        const pressed = value === view
        const count = counts[view]
        return (
          <button
            key={view}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(pressed ? null : view)}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-control border px-2.5 text-sm transition-colors duration-fast',
              pressed ? 'border-transparent bg-accent-soft font-medium text-accent-text' : 'bg-surface text-muted hover:bg-sunken hover:text-ink',
            )}
          >
            {SMART_VIEW_LABEL[view]}
            {count > 0 && (
              <span className={cn('text-xs tabular-nums', view === 'overdue' && !pressed ? 'font-medium text-status-overdue' : 'text-muted')}>
                <span className="sr-only">, </span>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
