import { cn } from '@/lib/cn'
import type { MoodLevel } from '@/types/domain'
import { MoodFace } from './MoodFace'
import { MOOD_LABEL } from './lib/levels'

/** Read-only level: the face plus the word, so it reads without colour. */
export function MoodLevelChip({ level, className }: { level: MoodLevel; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', className)}>
      <MoodFace level={level} size={20} />
      <span>{MOOD_LABEL[level]}</span>
    </span>
  )
}
