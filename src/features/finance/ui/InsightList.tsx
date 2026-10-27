import { cn } from '@/lib/cn'
import type { Insight } from '@/lib/financeInsights'
import { PrivacyBlur } from './Amount'

export function InsightList({ insights }: { insights: Insight[] }) {
  return (
    <section aria-label="Sekilas" className="rounded-card border bg-surface p-4">
      <h3 className="mb-2 text-sm font-bold">Sekilas</h3>
      <ul className="space-y-1.5 text-sm">
        {insights.map((i) => (
          <li key={i.id} className={cn(!i.enough && 'text-muted')}>
            <PrivacyBlur active={i.hasAmount} className="inline-block">
              {i.text}
            </PrivacyBlur>
          </li>
        ))}
      </ul>
    </section>
  )
}
