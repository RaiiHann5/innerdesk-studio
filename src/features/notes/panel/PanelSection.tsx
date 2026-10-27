import { useId, type ReactNode } from 'react'

/** A titled group in the panel, separated from the one before it by a hairline. */
export function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="space-y-3 border-t pt-5 first:border-t-0 first:pt-0">
      <h3 id={id} className="font-ui text-sm font-medium text-muted">
        {title}
      </h3>
      {children}
    </section>
  )
}
