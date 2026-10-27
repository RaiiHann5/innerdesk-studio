import { Skeleton } from '@/components/ui/Skeleton'

/** The shape of the tab while it loads. Ringkasan: balance, stats, a chart and bars. The others: a bar and rows. */
export function FinanceSkeleton({ variant = 'overview' }: { variant?: 'overview' | 'list' }) {
  if (variant === 'list')
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Memuat keuangan">
        <Skeleton className="h-10 w-full" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Memuat keuangan">
      <Skeleton className="h-20 w-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
      </div>
    </div>
  )
}
