import { cn } from '@/lib/cn'
import type { IdeaRating } from '@/types/domain'
import { FIELD_LABEL, RATINGS, RATING_LABEL, type RatingField } from './lib/matrix'

interface RatingPickerProps {
  field: RatingField
  /** Used only to name the group, so a screen reader can tell the pickers of different ideas apart. */
  ideaId: string
  ideaText: string
  value: IdeaRating | undefined
  /** Gets the score that was pressed, not the new value: pressing the current one is how a score is cleared. */
  onPick: (clicked: IdeaRating) => void
}

/**
 * Three buttons for one axis of one idea. Plain buttons with `aria-pressed` rather than a drag, so it works the same
 * with a keyboard, a screen reader and a thumb. The `data-rate` key lets the stage put focus back on the button after
 * the idea moves to another quadrant and this one is drawn again.
 */
export function RatingPicker({ field, ideaId, ideaText, value, onPick }: RatingPickerProps) {
  return (
    <div role="group" aria-label={`${FIELD_LABEL[field]} ide: ${ideaText}`} className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span aria-hidden className="w-12 shrink-0 text-xs text-muted">
        {FIELD_LABEL[field]}
      </span>
      <div className="flex flex-wrap gap-1">
        {RATINGS.map((rating) => {
          const on = value === rating
          return (
            <button
              key={rating}
              type="button"
              aria-pressed={on}
              data-rate={`${ideaId}:${field}:${rating}`}
              onClick={() => onPick(rating)}
              className={cn(
                'h-8 min-w-12 rounded-chip border px-2 text-xs font-medium transition-colors duration-fast',
                on ? 'border-accent-text bg-accent-soft text-accent-text' : 'text-muted hover:bg-sunken hover:text-ink',
              )}
            >
              {RATING_LABEL[field][rating]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
