import { cn } from '@/lib/cn'

interface UsageBarProps {
  /** Spent as a share of the limit, may pass 100. Null when there is no limit. */
  pct: number | null
  label: string
  over?: boolean
}

/** A thin bar for budgets and goals. Orange up to the limit; the text beside it, not the colour, says when it is over. */
export function UsageBar({ pct, label, over }: UsageBarProps) {
  const width = Math.max(0, Math.min(100, pct ?? 0))
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(width)} className="h-1.5 overflow-hidden rounded-full bg-sunken">
      <div className={cn('h-full rounded-full', over ? 'bg-faint' : 'bg-accent')} style={{ width: `${width}%` }} />
    </div>
  )
}
