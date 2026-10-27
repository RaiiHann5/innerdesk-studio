import { useRef, useState } from 'react'
import { controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'

interface InlineEditProps {
  value: string
  label: string
  maxLength: number
  onSave: (next: string) => void
  onCancel: () => void
  className?: string
}

/**
 * A text field that replaces a label while it is being edited. Enter or leaving the field saves, Escape cancels.
 * It reports once: Enter followed by the blur of the field going away does not save twice. Mount it fresh for each edit.
 */
export function InlineEdit({ value, label, maxLength, onSave, onCancel, className }: InlineEditProps) {
  const [draft, setDraft] = useState(value)
  const done = useRef(false)

  const finish = (save: boolean) => {
    if (done.current) return
    done.current = true
    if (save) onSave(draft)
    else onCancel()
  }

  return (
    <input
      autoFocus
      aria-label={label}
      value={draft}
      maxLength={maxLength}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          finish(true)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          finish(false)
        }
      }}
      className={cn(controlClass, className)}
    />
  )
}
