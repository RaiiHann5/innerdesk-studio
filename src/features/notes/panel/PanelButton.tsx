import type { Icon } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'

interface PanelButtonProps {
  icon: Icon
  label: string
  /** Pass a boolean for a toggle (it becomes aria-pressed); leave it out for a one-shot action. */
  active?: boolean
  /** Shows the label next to the icon instead of only in the tooltip. */
  showLabel?: boolean
  disabled?: boolean
  onClick: () => void
}

/** A quiet outline button for the Tampilan panel. Active uses the soft accent, never a filled circle. */
export function PanelButton({ icon: Glyph, label, active, showLabel, disabled, onClick }: PanelButtonProps) {
  return (
    <button
      type="button"
      aria-label={showLabel ? undefined : label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      // Keeps the text selection in the paper while the button is pressed, so the action applies to it.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-control border text-sm transition-colors duration-fast disabled:pointer-events-none disabled:opacity-40',
        showLabel ? 'min-w-0 justify-start gap-1.5 px-2' : 'w-full',
        active ? 'border-transparent bg-accent-soft text-accent-text' : 'bg-surface text-muted hover:border-faint hover:text-ink',
      )}
    >
      <Glyph size={18} weight={active ? 'bold' : 'regular'} aria-hidden className="shrink-0" />
      {showLabel && <span className="truncate">{label}</span>}
    </button>
  )
}
