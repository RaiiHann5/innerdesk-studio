import type { CategoryColor } from '@/types/domain'

/** Full class names, so Tailwind can see them. `bar` is the solid left edge, `tint` the event surface. */
export const CATEGORY_STYLE: Record<CategoryColor, { bar: string; tint: string }> = {
  moss: { bar: 'bg-cat-moss', tint: 'bg-cat-moss/15' },
  ochre: { bar: 'bg-cat-ochre', tint: 'bg-cat-ochre/15' },
  clay: { bar: 'bg-cat-clay', tint: 'bg-cat-clay/15' },
  teal: { bar: 'bg-cat-teal', tint: 'bg-cat-teal/15' },
  slate: { bar: 'bg-cat-slate', tint: 'bg-cat-slate/15' },
  rosewood: { bar: 'bg-cat-rosewood', tint: 'bg-cat-rosewood/15' },
}
