import type { KeyboardEvent } from 'react'
import { CATEGORY_STYLE } from '@/features/calendar/categories'
import { cn } from '@/lib/cn'
import type { CategoryColor } from '@/types/domain'

export const PROJECT_COLORS: Array<{ value: CategoryColor; label: string }> = [
  { value: 'moss', label: 'Lumut' },
  { value: 'ochre', label: 'Oker' },
  { value: 'clay', label: 'Tanah liat' },
  { value: 'teal', label: 'Teal' },
  { value: 'slate', label: 'Batu tulis' },
  { value: 'rosewood', label: 'Kayu mawar' },
]

/** Six muted colours as a radio group. The chosen one gets a ring; every swatch is named for screen readers. */
export function ProjectColorPicker({ value, onChange, label = 'Warna project' }: { value: CategoryColor; onChange: (next: CategoryColor) => void; label?: string }) {
  // One tab stop for the group; the arrow keys move the choice, as in any radio group.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const from = PROJECT_COLORS.findIndex((c) => c.value === value)
    const next = PROJECT_COLORS[(from + step + PROJECT_COLORS.length) % PROJECT_COLORS.length]
    onChange(next.value)
    e.currentTarget.querySelector<HTMLElement>(`[data-color="${next.value}"]`)?.focus()
  }

  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className="flex items-center gap-2">
      {PROJECT_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          role="radio"
          aria-checked={c.value === value}
          tabIndex={c.value === value ? 0 : -1}
          data-color={c.value}
          aria-label={c.label}
          title={c.label}
          onClick={() => onChange(c.value)}
          className={cn(
            'size-6 rounded-full transition-shadow duration-fast',
            CATEGORY_STYLE[c.value].bar,
            c.value === value ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : 'hover:ring-2 hover:ring-line hover:ring-offset-2 hover:ring-offset-surface',
          )}
        />
      ))}
    </div>
  )
}

