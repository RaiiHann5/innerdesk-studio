import { cn } from '@/lib/cn'
import type { Habit } from '@/types/domain'
import { HABIT_ICON, HABIT_STYLE } from './habitUi'

/** The habit's icon on a tint of its colour. Decorative: the name always sits beside it. */
export function HabitIconTile({ habit, className }: { habit: Pick<Habit, 'icon' | 'color'>; className?: string }) {
  const IconComponent = HABIT_ICON[habit.icon]
  return (
    <span aria-hidden className={cn('grid size-10 shrink-0 place-items-center rounded-control', HABIT_STYLE[habit.color].tint, HABIT_STYLE[habit.color].text, className)}>
      <IconComponent size={20} weight="duotone" />
    </span>
  )
}
