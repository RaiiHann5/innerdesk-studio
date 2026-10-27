import { cn } from '@/lib/cn'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Id of the element that names the switch. */
  labelledBy: string
  disabled?: boolean
}

export function Switch({ checked, onChange, labelledBy, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-fast disabled:opacity-50',
        checked ? 'border-accent bg-accent' : 'border-muted bg-sunken',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute left-0.5 top-0.5 size-3.5 rounded-full transition-transform duration-fast',
          checked ? 'translate-x-4 bg-accent-on' : 'bg-muted',
        )}
      />
    </button>
  )
}
