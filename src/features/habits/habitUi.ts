import {
  AppleLogo,
  BookOpen,
  Barbell,
  Bicycle,
  Brain,
  Coffee,
  Drop,
  Heart,
  Leaf,
  MoonStars,
  PencilLine,
  PersonSimpleWalk,
  Star,
  Sun,
  Target,
  type Icon,
} from '@phosphor-icons/react'
import type { CategoryColor, Habit, HabitIconKey } from '@/types/domain'

export const HABIT_ICONS: Array<{ key: HabitIconKey; label: string; icon: Icon }> = [
  { key: 'drop', label: 'Air', icon: Drop },
  { key: 'barbell', label: 'Olahraga', icon: Barbell },
  { key: 'walk', label: 'Jalan kaki', icon: PersonSimpleWalk },
  { key: 'bicycle', label: 'Sepeda', icon: Bicycle },
  { key: 'book', label: 'Buku', icon: BookOpen },
  { key: 'pencil', label: 'Menulis', icon: PencilLine },
  { key: 'brain', label: 'Belajar', icon: Brain },
  { key: 'moon', label: 'Tidur', icon: MoonStars },
  { key: 'sun', label: 'Pagi', icon: Sun },
  { key: 'coffee', label: 'Kopi', icon: Coffee },
  { key: 'apple', label: 'Makan sehat', icon: AppleLogo },
  { key: 'leaf', label: 'Tenang', icon: Leaf },
  { key: 'heart', label: 'Hati', icon: Heart },
  { key: 'target', label: 'Target', icon: Target },
  { key: 'star', label: 'Bintang', icon: Star },
]

export const HABIT_ICON: Record<HabitIconKey, Icon> = Object.fromEntries(HABIT_ICONS.map((i) => [i.key, i.icon])) as Record<HabitIconKey, Icon>

/** Full class names, so Tailwind can see them. `solid` is a finished day, `tint` a started one, `text` the colour on a plain surface. */
export const HABIT_STYLE: Record<CategoryColor, { solid: string; tint: string; text: string }> = {
  moss: { solid: 'bg-cat-moss', tint: 'bg-cat-moss/20', text: 'text-cat-moss' },
  ochre: { solid: 'bg-cat-ochre', tint: 'bg-cat-ochre/20', text: 'text-cat-ochre' },
  clay: { solid: 'bg-cat-clay', tint: 'bg-cat-clay/20', text: 'text-cat-clay' },
  teal: { solid: 'bg-cat-teal', tint: 'bg-cat-teal/20', text: 'text-cat-teal' },
  slate: { solid: 'bg-cat-slate', tint: 'bg-cat-slate/20', text: 'text-cat-slate' },
  rosewood: { solid: 'bg-cat-rosewood', tint: 'bg-cat-rosewood/20', text: 'text-cat-rosewood' },
}

export type HabitPreset = Partial<Pick<Habit, 'name' | 'description' | 'icon' | 'color' | 'days' | 'target' | 'unit'>>

/** Starting points offered on an empty page, so the first habit is a tap and a confirm rather than a blank form. */
export const HABIT_PRESETS: HabitPreset[] = [
  { name: 'Minum air putih', icon: 'drop', color: 'teal', target: 8, unit: 'gelas' },
  { name: 'Olahraga 30 menit', icon: 'barbell', color: 'clay', days: [1, 3, 5], target: 1 },
  { name: 'Baca buku', icon: 'book', color: 'ochre', target: 10, unit: 'halaman' },
  { name: 'Tidur sebelum 23.00', icon: 'moon', color: 'slate', target: 1 },
]
