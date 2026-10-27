import { forwardRef, type ButtonHTMLAttributes } from 'react'
import type { Icon, IconWeight } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  icon: Icon
  label: string
  weight?: IconWeight
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: IconComponent, label, weight, className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-control text-muted transition-colors duration-fast hover:bg-sunken hover:text-ink aria-expanded:bg-sunken aria-expanded:text-ink',
        className,
      )}
      {...props}
    >
      <IconComponent aria-hidden weight={weight} />
    </button>
  )
})
