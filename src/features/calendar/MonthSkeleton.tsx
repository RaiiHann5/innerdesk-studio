import { Skeleton } from '@/components/ui/Skeleton'

/** Same geometry as MonthView: header row plus six week rows of seven cells. */
export function MonthSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat bulan" className="flex h-full min-h-[44rem] flex-col rounded-card border bg-surface">
      <div className="grid grid-cols-7 border-b">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="px-2 py-2.5">
            <Skeleton className="h-3 w-7" />
          </div>
        ))}
      </div>
      {Array.from({ length: 6 }, (_, row) => (
        <div key={row} className="grid min-h-28 flex-1 grid-cols-7 border-b last:border-b-0">
          {Array.from({ length: 7 }, (_, col) => (
            <div key={col} className="space-y-1.5 border-r p-1 last:border-r-0">
              <Skeleton className="size-7 rounded-full" />
              {(row + col) % 3 !== 0 && <Skeleton className="h-5 w-full" />}
              {(row * 2 + col) % 4 === 0 && <Skeleton className="h-5 w-3/4" />}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
