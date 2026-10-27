import { InsightList } from '@/features/mood/InsightList'
import { MoodHeatmap } from '@/features/mood/MoodHeatmap'
import { MoodTrendChart } from '@/features/mood/MoodTrendChart'
import type { MoodEntry } from '@/types/domain'

interface PatternColumnProps {
  entries: MoodEntry[]
  selected: string
  onSelect: (date: string) => void
}

/** What the moods add up to: the month, the last thirty days, and the patterns. Beside the page on a wide screen, under it otherwise. */
export function PatternColumn({ entries, selected, onSelect }: PatternColumnProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
      <section aria-label="Kalender suasana hati" className="rounded-card border bg-surface p-4">
        <MoodHeatmap entries={entries} selectedDate={selected} onSelect={onSelect} />
      </section>
      <section aria-labelledby="trend-title" className="rounded-card border bg-surface p-4">
        <h2 id="trend-title" className="mb-3 font-display text-md font-bold tracking-tight">
          30 hari terakhir
        </h2>
        <MoodTrendChart entries={entries} />
      </section>
      <section aria-labelledby="insight-title" className="rounded-card border bg-surface p-4 md:col-span-2 xl:col-span-1">
        <h2 id="insight-title" className="mb-3 font-display text-md font-bold tracking-tight">
          Pola
        </h2>
        <InsightList entries={entries} />
      </section>
    </div>
  )
}
