import { Skeleton } from '@/components/ui/Skeleton'

const columns = [0, 1, 2, 3]

/** Stats, the Papan/Daftar/Arsip tabs, the filter row and four phase columns: the shape of the Projects page. */
export function ProjectsSkeleton() {
  return (
    <div role="status" aria-label="Memuat" className="space-y-6">
      <Skeleton className="h-20 rounded-card" />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-8 w-64" />
        </div>
      </div>
      <div className="flex gap-4 overflow-hidden">
        {columns.map((i) => (
          <div key={i} className="min-w-60 flex-1 space-y-3">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-36" />
            {i % 2 === 0 && <Skeleton className="h-36" />}
          </div>
        ))}
      </div>
    </div>
  )
}

/** The project page below its hero: four tabs, a stats row, a few lines, the phase row and the milestones. */
export function ProjectDetailSkeleton() {
  return (
    <div role="status" aria-label="Memuat" className="space-y-6">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-20 rounded-card" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {columns.map((i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
    </div>
  )
}
