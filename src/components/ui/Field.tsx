import type { ReactNode } from 'react'

export const controlClass =
  'h-8 w-full rounded-control border bg-surface px-2.5 text-base text-ink transition-colors duration-fast placeholder:text-muted hover:border-faint'

interface FieldProps {
  label: string
  htmlFor: string
  hint?: string
  children: ReactNode
}

export function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}
