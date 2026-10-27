import { Skeleton } from '@/components/ui/Skeleton'
import { GUTTER_PX } from './lib/timeGeometry'

/** Block positions as full class names so Tailwind can see them; columns cycle through the sets. */
const BLOCKS = [
  ['top-6 h-16', 'top-44 h-14'],
  ['top-16 h-20'],
  ['top-10 h-12', 'top-32 h-16', 'top-60 h-12'],
  ['top-28 h-24'],
]

/** Same geometry as TimeGrid: a header row, the all-day row, then hour rows with a few event-shaped blocks. */
export function TimeGridSkeleton({ columns }: { columns: 1 | 7 }) {
  const cols = Array.from({ length: columns }, (_, i) => i)
  const style = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
  return (
    <div aria-busy="true" aria-label="Memuat jadwal" className="flex h-full min-h-[30rem] flex-col overflow-hidden rounded-card border bg-surface">
      <div className="flex border-b">
        <div className="shrink-0" style={{ width: GUTTER_PX }} />
        <div className="grid flex-1" style={style}>
          {cols.map((i) => (
            <div key={i} className="flex items-center gap-2 border-l px-3 py-2">
              <Skeleton className="h-3 w-7" />
              <Skeleton className="size-9 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="shrink-0" style={{ width: GUTTER_PX }} />
        <div className="grid flex-1" style={style}>
          {cols.map((i) => (
            <div key={i} className="relative border-l">
              {BLOCKS[i % BLOCKS.length].map((place) => (
                <Skeleton key={place} className={`absolute inset-x-1 ${place}`} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
