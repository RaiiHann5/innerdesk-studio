import { cn } from '@/lib/cn'

interface CycleDotsProps {
  /** Focus sessions done in this cycle. */
  done: number
  total: number
  className?: string
}

/**
 * Four dots, filled as focus sessions complete. The one that is about to be worked on is outlined
 * rather than filled, so the next step is readable at a glance without counting.
 */
export function CycleDots({ done, total, className }: CycleDotsProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)} role="img" aria-label={`${done} dari ${total} sesi fokus selesai`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            'size-2 rounded-full transition-colors duration-base',
            i < done ? 'bg-accent' : i === done ? 'border border-accent bg-transparent' : 'bg-line',
          )}
        />
      ))}
    </div>
  )
}