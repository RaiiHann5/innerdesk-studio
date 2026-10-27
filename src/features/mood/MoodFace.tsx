import { cn } from '@/lib/cn'
import type { MoodLevel } from '@/types/domain'
import { MOOD_SWATCH } from './lib/levels'

interface MoodFaceProps {
  /** Null draws an empty, dashed face for a day nothing was logged. */
  level: MoodLevel | null
  size?: number
  className?: string
}

const FILL: Record<MoodLevel, string> = {
  1: 'fill-mood-1',
  2: 'fill-mood-2',
  3: 'fill-mood-3',
  4: 'fill-mood-4',
  5: 'fill-mood-5',
}

/**
 * One face per level, drawn so the five differ in shape and not only in colour: slanted brows and a deep
 * frown, a shallow frown, a flat mouth, a smile, and closed happy eyes with an open smile and cheeks.
 * Decorative: whatever shows it also names the level in words.
 */
export function MoodFace({ level, size = 40, className }: MoodFaceProps) {
  const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden focusable="false" className={cn('shrink-0 text-mood-on-low', className)}>
      {level === null ? (
        <circle cx="24" cy="24" r="21" fill="none" strokeWidth="1.5" strokeDasharray="3 3.5" className="stroke-faint" />
      ) : (
        <>
          <circle cx="24" cy="24" r="22" className={FILL[level]} />
          {level === 5 ? (
            <>
              <path d="M13.5 22 Q17 17.5 20.5 22" {...line} />
              <path d="M27.5 22 Q31 17.5 34.5 22" {...line} />
              <path d="M15.5 29 Q24 41 32.5 29 Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <circle cx="11" cy="29" r="3" className="fill-mood-1" opacity="0.75" />
              <circle cx="37" cy="29" r="3" className="fill-mood-1" opacity="0.75" />
            </>
          ) : (
            <>
              <circle cx="17" cy="21" r="2.4" fill="currentColor" />
              <circle cx="31" cy="21" r="2.4" fill="currentColor" />
              {level === 1 && (
                <>
                  <path d="M12.5 17.5 L20.5 14.5" {...line} strokeWidth={2} />
                  <path d="M35.5 17.5 L27.5 14.5" {...line} strokeWidth={2} />
                  <path d="M16.5 34.5 Q24 27 31.5 34.5" {...line} />
                </>
              )}
              {level === 2 && <path d="M17.5 33.5 Q24 29 30.5 33.5" {...line} />}
              {level === 3 && <path d="M18 32 H30" {...line} />}
              {level === 4 && <path d="M17 30 Q24 37 31 30" {...line} />}
            </>
          )}
        </>
      )}
    </svg>
  )
}

/** A small filled dot in the level's colour, for places a whole face would be too much. */
export function MoodDot({ level, className }: { level: MoodLevel; className?: string }) {
  return <span aria-hidden className={cn('inline-block size-2.5 rounded-full border border-ink/15', MOOD_SWATCH[level], className)} />
}
