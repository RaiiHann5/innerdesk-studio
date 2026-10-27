import { cn } from '@/lib/cn'

interface ProgressBarProps {
  value: number
  label: string
  className?: string
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className={cn('h-1 overflow-hidden rounded-full bg-sunken', className)}
    >
      <div className="h-full rounded-full bg-ink transition-[width] duration-base" style={{ width: `${value}%` }} />
    </div>
  )
}
