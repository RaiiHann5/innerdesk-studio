import { isCounted, valueOn, type CellState, type LogIndex } from '@/lib/habits'
import type { Habit } from '@/types/domain'

export const STATE_LABEL: Record<CellState, string> = {
  done: 'Selesai',
  partial: 'Sebagian',
  missed: 'Terlewat',
  off: 'Di luar jadwal',
  open: 'Belum selesai',
  future: 'Belum tiba',
}

/** "Sebagian 3/8 gelas" for a started counted habit, otherwise the plain label. */
export function statusText(habit: Habit, index: LogIndex, date: string, state: CellState): string {
  if (state === 'partial' && isCounted(habit)) return `Sebagian ${valueOn(index, habit.id, date)}/${habit.target}${habit.unit ? ` ${habit.unit}` : ''}`
  return STATE_LABEL[state]
}
