import { useLayoutEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

interface LearningFieldProps {
  value: string
  onChange: (value: string) => void
}

export const LEARNING_MAX = 2000

/** A plain text box that grows with what is typed, up to a limit, then scrolls. */
export function LearningField({ value, onChange }: LearningFieldProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`
  }, [value])

  return (
    <div>
      <label htmlFor="learning-input" className="sr-only">
        Yang dipelajari hari ini
      </label>
      <textarea
        id="learning-input"
        ref={ref}
        rows={3}
        value={value}
        maxLength={LEARNING_MAX}
        placeholder="Apa yang kamu pelajari hari ini, sekecil apa pun?"
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'block min-h-[6rem] w-full resize-none rounded-control border bg-surface px-3 py-2.5 text-md text-ink transition-colors duration-fast',
          'placeholder:text-muted hover:border-faint focus:border-ink focus:outline-none',
        )}
      />
    </div>
  )
}
