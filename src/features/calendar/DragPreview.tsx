import { cn } from '@/lib/cn'
import type { Category } from '@/types/domain'
import { CATEGORY_STYLE } from './categories'
import { minutesToPx } from './lib/timeGeometry'

interface DragPreviewProps {
  /** Minutes from the top of the day. */
  startMin: number
  endMin: number
  title: string
  category?: Category
  /** A new event being drawn has no stored colour yet. */
  dashed?: boolean
  label: string
}

/**
 * The block that follows the pointer. This is the one place a shadow is allowed outside popovers:
 * it is lifted and tilted so it reads as held rather than drawn onto the grid.
 */
export function DragPreview({ startMin, endMin, title, category, dashed, label }: DragPreviewProps) {
  const color = category ? CATEGORY_STYLE[category.colorToken] : null
  const height = minutesToPx(endMin - startMin) - 2
  const compact = height < 44
  const wholeHour = Math.floor(startMin / 60) * 60
  const time = `${String(wholeHour).padStart(2, '0')}:${String(Math.round(startMin % 60)).padStart(2, '0')}`

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-1 -rotate-1 overflow-hidden rounded-control bg-surface shadow-lift',
        dashed && 'border border-dashed border-accent',
      )}
      style={{ top: minutesToPx(startMin) + 1, height }}
    >
      <span className={cn('absolute inset-0', dashed ? 'bg-accent-soft' : (color?.tint ?? 'bg-sunken'))} />
      <span className={cn('absolute inset-y-0 left-0 w-[3px]', dashed ? 'bg-accent' : (color?.bar ?? 'bg-faint'))} />
      <span className="relative flex h-full flex-col gap-0.5 overflow-hidden py-1 pl-2.5 pr-1.5">
        <span className="truncate font-medium">{title}</span>
        {!compact && <span className="tabular-nums text-muted">{time}</span>}
      </span>
      <span className="sr-only">{label}</span>
    </div>
  )
}