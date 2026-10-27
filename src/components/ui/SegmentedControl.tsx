import { cn } from '@/lib/cn'

interface SegmentedControlProps<T extends string> {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  label: string
  /** Stretches to the container and shares the width equally. For narrow screens. */
  fullWidth?: boolean
}

export function SegmentedControl<T extends string>({ options, value, onChange, label, fullWidth }: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('gap-0.5 rounded-control bg-sunken p-0.5', fullWidth ? 'flex w-full' : 'inline-flex')}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-7 rounded-chip px-3 text-sm font-medium transition-colors duration-fast',
            fullWidth && 'flex-1 whitespace-nowrap px-2',
            o.value === value ? 'bg-accent-soft text-accent-text' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
