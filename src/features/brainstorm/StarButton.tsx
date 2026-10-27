import { Star } from '@phosphor-icons/react'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'

interface StarButtonProps {
  starred: boolean
  onToggle: () => void
}

/** The v1 way to mark an idea worth acting on. The label stays the same and `aria-pressed` carries the state. */
export function StarButton({ starred, onToggle }: StarButtonProps) {
  return <IconButton icon={Star} weight={starred ? 'fill' : 'regular'} label="Tandai ide penting" aria-pressed={starred} onClick={onToggle} className={cn(starred && 'text-accent-text')} />
}
