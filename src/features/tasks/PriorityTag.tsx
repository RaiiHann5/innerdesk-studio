import { Flag } from '@phosphor-icons/react'
import { Pill } from '@/components/ui/Pill'
import { cn } from '@/lib/cn'
import { PRIORITY_LABEL } from '@/lib/labels'
import type { Priority } from '@/types/domain'

const flagTone: Record<Priority, string> = {
  urgent: 'text-status-overdue',
  high: 'text-ink',
  medium: 'text-muted',
  low: 'text-faint',
}

export function PriorityTag({ priority }: { priority: Priority }) {
  return (
    <Pill>
      <Flag size={12} weight={priority === 'urgent' || priority === 'high' ? 'fill' : 'regular'} aria-hidden className={cn(flagTone[priority])} />
      {PRIORITY_LABEL[priority]}
    </Pill>
  )
}
