import { cn } from '@/lib/cn'
import type { MoodFactor } from '@/types/domain'
import { FACTORS } from './lib/levels'

interface FactorChipsProps {
  value: MoodFactor[]
  onChange: (value: MoodFactor[]) => void
}

/** Optional toggles for what shaped the day. Each chip is a pressed/unpressed button. */
export function FactorChips({ value, onChange }: FactorChipsProps) {
  const toggle = (id: MoodFactor) => onChange(value.includes(id) ? value.filter((f) => f !== id) : [...value, id])

  return (
    <div role="group" aria-label="Faktor hari ini" className="flex flex-wrap gap-2">
      {FACTORS.map(({ id, label, icon: IconComponent }) => {
        const pressed = value.includes(id)
        return (
          <button
            key={id}
            type="button"
            aria-pressed={pressed}
            onClick={() => toggle(id)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-control border px-3 text-sm transition-colors duration-fast',
              pressed
                ? 'border-accent bg-accent-soft font-semibold text-accent-text'
                : 'bg-surface font-medium text-muted hover:border-faint hover:text-ink',
            )}
          >
            <IconComponent size={16} weight={pressed ? 'fill' : 'regular'} aria-hidden />
            {label}
          </button>
        )
      })}
    </div>
  )
}
