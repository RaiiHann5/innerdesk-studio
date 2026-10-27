import { useRef, type KeyboardEvent } from 'react'
import { Check } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import type { MoodLevel } from '@/types/domain'
import { MOOD_FILL, MOOD_LABEL, MOOD_LEVELS } from './lib/levels'

interface MoodScaleProps {
  value: MoodLevel | null
  onChange: (value: MoodLevel) => void
}

/**
 * Five-step segmented scale. A radio group: arrows move and select, and only one segment is in the
 * tab order. Each step carries its number and its label, so level never depends on colour.
 */
export function MoodScale({ value, onChange }: MoodScaleProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const tabbable: MoodLevel = value ?? 3

  const onKeyDown = (event: KeyboardEvent, level: MoodLevel) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    const target = event.key === 'Home' ? 1 : event.key === 'End' ? 5 : step ? level + step : null
    if (target === null || target < 1 || target > 5) return
    event.preventDefault()
    onChange(target as MoodLevel)
    refs.current[target - 1]?.focus()
  }

  return (
    <div role="radiogroup" aria-label="Suasana hati hari ini, skala 1 sampai 5" className="grid grid-cols-5 gap-1.5">
      {MOOD_LEVELS.map((level) => {
        const selected = level === value
        return (
          <button
            key={level}
            ref={(el) => {
              refs.current[level - 1] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={level === tabbable ? 0 : -1}
            onClick={() => onChange(level)}
            onKeyDown={(e) => onKeyDown(e, level)}
            className={cn(
              'flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-control border-2 px-1 text-center transition-colors duration-fast',
              MOOD_FILL[level],
              selected ? 'border-ink' : 'border-transparent hover:border-ink/30',
            )}
          >
            <span className="flex items-center gap-1 text-md font-semibold tabular-nums">
              {selected && <Check size={14} weight="bold" aria-hidden />}
              {level}
            </span>
            <span className={cn('text-xs leading-tight', selected ? 'font-semibold' : 'font-medium')}>{MOOD_LABEL[level]}</span>
          </button>
        )
      })}
    </div>
  )
}
