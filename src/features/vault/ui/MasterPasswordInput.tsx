import { forwardRef, type InputHTMLAttributes } from 'react'
import { controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'

/** A password field that asks the browser not to remember, correct or suggest anything about it. */
export const MasterPasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function MasterPasswordInput(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type="password"
      autoComplete="off"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      className={cn(controlClass, className)}
      {...props}
    />
  )
})
