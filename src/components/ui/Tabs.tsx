import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface TabItem<T extends string> {
  value: T
  label: string
  /** Shown after the label as a small tabular number. */
  count?: number
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  idPrefix: string
  actions?: ReactNode
  /** 'neutral' keeps the selected tab off the accent colour when a primary button sits beside the tabs. */
  tone?: 'accent' | 'neutral'
}

export const tabId = (prefix: string, value: string) => `${prefix}-tab-${value}`
export const panelId = (prefix: string, value: string) => `${prefix}-panel-${value}`

export function Tabs<T extends string>({ items, value, onChange, label, idPrefix, actions, tone = 'accent' }: TabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const last = items.length - 1
    const next = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[e.key]
    if (next === undefined) return
    e.preventDefault()
    onChange(items[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div
        role="tablist"
        aria-label={label}
        className="relative flex min-w-0 gap-1 overflow-x-auto rounded-card border bg-surface p-1"
      >
        {items.map((item, i) => {
          const selected = item.value === value
          return (
            <button
              key={item.value}
              ref={(el) => {
                refs.current[i] = el
              }}
              role="tab"
              id={tabId(idPrefix, item.value)}
              aria-selected={selected}
              aria-controls={panelId(idPrefix, item.value)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                'h-8 shrink-0 rounded-control px-3 text-sm font-medium transition-colors duration-fast',
                selected ? (tone === 'accent' ? 'bg-accent text-accent-on' : 'bg-sunken text-ink') : 'text-muted hover:bg-sunken hover:text-ink',
              )}
            >
              {item.label}
              {item.count !== undefined && <span className="ml-1.5 text-xs font-normal tabular-nums opacity-70">{item.count}</span>}
            </button>
          )
        })}
      </div>
      {actions}
    </div>
  )
}
