import type { LibrarySummary } from '@/lib/library'

/** One line of numbers about this year. Not a dashboard: it is here to be glanced at, so it stays small. */
export function StatsStrip({ summary, year }: { summary: LibrarySummary; year: number }) {
  const stats = [
    { label: `Film ${year}`, value: String(summary.filmsThisYear) },
    { label: `Buku ${year}`, value: String(summary.booksThisYear) },
    { label: 'Halaman terbaca', value: summary.pagesThisYear.toLocaleString('id-ID') },
    { label: 'Rata-rata rating', value: summary.averageStars === null ? '-' : summary.averageStars.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) },
  ]
  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-2 border-y py-3">
      {stats.map((s) => (
        <div key={s.label} className="flex items-baseline gap-2">
          <dd className="font-mono text-lg font-medium tabular-nums">{s.value}</dd>
          <dt className="text-xs text-muted">{s.label}</dt>
        </div>
      ))}
    </dl>
  )
}
