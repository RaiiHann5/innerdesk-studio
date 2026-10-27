import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function Pill({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('inline-flex h-5 items-center gap-1 rounded-control bg-sunken px-2 text-xs font-medium text-muted', className)}
      {...props}
    />
  )
}
