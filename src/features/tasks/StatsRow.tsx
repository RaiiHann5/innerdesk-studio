import { cn } from '@/lib/cn'
import type { StatItem } from '@/lib/taskStats'

export function StatsRow({ items, label }: { items: StatItem[]; label: string }) {
  return (
    <dl aria-label={label} className="grid grid-cols-2 gap-px overflow-hidden rounded-card border bg-line lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-surface p-4">
          <dt className="text-sm text-muted">{item.label}</dt>
          <dd className={cn('mt-1 font-display text-xl font-bold tabular-nums', item.danger && 'text-status-overdue')}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
