import { cn } from '@/lib/cn'
import type { CategoryTotal } from '@/lib/financeSelectors'
import { sumMinor } from '@/lib/money'
import type { FinanceCategory } from '@/types/domain'
import { Amount } from './Amount'

const SHOWN = 5

interface CategoryBarsProps {
  totals: CategoryTotal[]
  categories: FinanceCategory[]
}

/** Top expense categories as horizontal bars. The share is written out, so the bar never carries it alone. */
export function CategoryBars({ totals, categories }: CategoryBarsProps) {
  const names = new Map(categories.map((c) => [c.id, c.name]))
  const top = totals.slice(0, SHOWN)
  const rest = totals.slice(SHOWN)
  const rows = [
    ...top.map((t) => ({ key: String(t.categoryId), name: t.categoryId ? (names.get(t.categoryId) ?? 'Kategori dihapus') : 'Tanpa kategori', total: t.totalMinor, share: t.sharePct })),
    ...(rest.length
      ? [{ key: 'rest', name: `${rest.length} kategori lain`, total: sumMinor(rest.map((r) => r.totalMinor)), share: Math.round(rest.reduce((n, r) => n + r.sharePct, 0) * 10) / 10 }]
      : []),
  ]

  return (
    <section aria-label="Pengeluaran per kategori" className="rounded-card border bg-surface p-4">
      <h3 className="mb-3 text-sm font-bold">Pengeluaran terbesar</h3>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Belum ada pengeluaran bulan ini.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row, i) => (
            <li key={row.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{row.name}</span>
                <span className="flex shrink-0 items-baseline gap-2">
                  <Amount minor={row.total} className="font-medium" />
                  <span className="w-12 text-right text-xs tabular-nums text-muted">{String(row.share).replace('.', ',')}%</span>
                </span>
              </div>
              <div aria-hidden className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken">
                <div className={cn('h-full rounded-full', i === 0 ? 'bg-accent' : 'bg-faint')} style={{ width: `${Math.min(100, row.share)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
