import { Skeleton } from '@/components/ui/Skeleton'

export function ViewSkeleton({ columns = 3 }: { columns?: number }) {
  return (
    <div role="status" aria-label="Memuat" className="flex gap-4 overflow-hidden">
      {Array.from({ length: columns }, (_, c) => (
        <div key={c} className="min-w-64 flex-1 space-y-3">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ))}
    </div>
  )
}
