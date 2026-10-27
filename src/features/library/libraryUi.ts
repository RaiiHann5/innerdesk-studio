import type { CategoryColor } from '@/types/domain'

/** Written out in full so Tailwind finds them. `bar` is the strip on a cover's spine, `tint` its paper, `text` the colour on a plain surface. */
export const ACCENT: Record<CategoryColor, { bar: string; tint: string; wash: string; text: string }> = {
  moss: { bar: 'bg-cat-moss', tint: 'bg-cat-moss/20', wash: 'bg-cat-moss/10', text: 'text-cat-moss' },
  ochre: { bar: 'bg-cat-ochre', tint: 'bg-cat-ochre/20', wash: 'bg-cat-ochre/10', text: 'text-cat-ochre' },
  clay: { bar: 'bg-cat-clay', tint: 'bg-cat-clay/20', wash: 'bg-cat-clay/10', text: 'text-cat-clay' },
  teal: { bar: 'bg-cat-teal', tint: 'bg-cat-teal/20', wash: 'bg-cat-teal/10', text: 'text-cat-teal' },
  slate: { bar: 'bg-cat-slate', tint: 'bg-cat-slate/20', wash: 'bg-cat-slate/10', text: 'text-cat-slate' },
  rosewood: { bar: 'bg-cat-rosewood', tint: 'bg-cat-rosewood/20', wash: 'bg-cat-rosewood/10', text: 'text-cat-rosewood' },
}

export const detailPath = (item: { id: string; kind: 'film' | 'buku' }) => `/library/${item.kind}/${item.id}`
