import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Star } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { RATING_MAX, formatRating, halfFromPosition, stepRating } from '@/lib/library'

/** How much of star `index` (0 to 4) is filled for a rating in half-stars: 0, 0.5 or 1. */
const fillOf = (rating: number, index: number) => Math.max(0, Math.min(1, (rating - index * 2) / 2))

function Stars({ rating, size }: { rating: number; size: number }) {
  return (
    <span aria-hidden className="inline-flex">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
          <Star size={size} className="absolute inset-0 text-faint" />
          <span className="absolute inset-y-0 left-0 overflow-hidden text-accent" style={{ width: `${fillOf(rating, i) * 100}%` }}>
            <Star size={size} weight="fill" className="max-w-none" />
          </span>
        </span>
      ))}
    </span>
  )
}

/** Stars for showing a rating, with the number beside it. Not interactive. */
export function RatingDisplay({ rating, size = 14, showNumber = true, className }: { rating: number | undefined; size?: number; showNumber?: boolean; className?: string }) {
  if (rating === undefined) return null
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <Stars rating={rating} size={size} />
      {showNumber && <span className="text-sm font-medium tabular-nums">{formatRating(rating)}</span>}
      <span className="sr-only">{`${formatRating(rating)} dari 5 bintang`}</span>
    </span>
  )
}

interface RatingInputProps {
  value: number | undefined
  onChange: (next: number | undefined) => void
  label: string
  size?: number
}

/**
 * Five stars in half steps. Hovering shows what a click would give, and the half is picked by which side of the star the
 * pointer is on. From the keyboard it is a slider: arrows move half a star, 1 to 5 jump to a whole number, 0, Delete,
 * Backspace and Escape clear it. Pressing the rating you already have clears it too.
 */
export function RatingInput({ value, onChange, label, size = 28 }: RatingInputProps) {
  const [hover, setHover] = useState<number | undefined>()
  const track = useRef<HTMLDivElement>(null)
  const shown = hover ?? value ?? 0

  const halfAt = (event: PointerEvent): number | undefined => {
    const box = track.current?.getBoundingClientRect()
    if (!box) return undefined
    return halfFromPosition(event.clientX, box.left, box.width)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    let next: number | undefined | null = null
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = stepRating(value, 1)
        break
      case 'ArrowLeft':
      case 'ArrowDown':
        next = stepRating(value, -1)
        break
      case 'Home':
      case '0':
      case 'Delete':
      case 'Backspace':
      case 'Escape':
        next = undefined
        break
      case 'End':
        next = RATING_MAX
        break
      default:
        if (/^[1-5]$/.test(event.key)) next = Number(event.key) * 2
    }
    if (next === null) return
    event.preventDefault()
    onChange(next)
  }

  return (
    <div className="inline-flex items-center gap-3">
      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={(value ?? 0) / 2}
        aria-valuetext={value === undefined ? 'Belum dinilai' : `${formatRating(value)} dari 5 bintang`}
        onKeyDown={onKeyDown}
        onPointerMove={(e) => setHover(halfAt(e))}
        onPointerLeave={() => setHover(undefined)}
        onClick={(e) => {
          const picked = halfAt(e as unknown as PointerEvent)
          if (picked !== undefined) onChange(picked === value ? undefined : picked)
        }}
        className="cursor-pointer touch-none rounded-chip outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-text"
      >
        <Stars rating={shown} size={size} />
      </div>
      <span aria-hidden className="min-w-16 font-display text-lg font-bold tabular-nums">
        {shown ? formatRating(shown) : <span className="text-base font-normal text-muted">Belum dinilai</span>}
      </span>
    </div>
  )
}
