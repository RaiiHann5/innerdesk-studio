import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import { estimateStrength } from '../lib/strength'

interface StrengthMeterProps {
  password: string
  id: string
}

/** Text carries the meaning; the bar only repeats it, so colour is never the only signal. */
export function StrengthMeter({ password, id }: StrengthMeterProps) {
  const strength = useMemo(() => estimateStrength(password), [password])
  if (password.length === 0) return <div id={id} />
  return (
    <div id={id} className="space-y-1.5">
      <div className="flex items-center gap-3">
        <div aria-hidden className="grid flex-1 grid-cols-4 gap-1">
          {[1, 2, 3, 4].map((segment) => (
            <div key={segment} className={cn('h-1 rounded-full', strength.level >= segment ? 'bg-ink' : 'bg-sunken')} />
          ))}
        </div>
        <p className="shrink-0 text-xs font-medium tabular-nums">
          {strength.label} <span className="font-normal text-muted">(perkiraan, ±{strength.bits} bit)</span>
        </p>
      </div>
      {strength.hints.length > 0 && (
        <ul className="space-y-0.5 text-xs text-muted">
          {strength.hints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
