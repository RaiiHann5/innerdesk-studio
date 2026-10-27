import { APP_NAME } from '@/lib/config'
import { cn } from '@/lib/cn'
import logoDark from '@/assets/brand/logo-dark.png'
import logoLight from '@/assets/brand/logo-light.png'
import markDark from '@/assets/brand/mark-dark.png'
import markLight from '@/assets/brand/mark-light.png'

/**
 * `light` is the artwork for the light theme (black), `dark` the one for the dark theme (white).
 * Both are in the DOM and the theme selector picks which one is displayed, so toggling the theme needs
 * no state and no re-render, and neither image has to load at the moment of the toggle.
 */
const ASSETS = {
  full: { light: logoLight, dark: logoDark },
  mark: { light: markLight, dark: markDark },
} as const

interface BrandLogoProps {
  /** `full` is the mark with the wordmark, `mark` is the symbol alone for tight spots. */
  variant?: keyof typeof ASSETS
  /** Sets the height; the width follows the artwork. */
  className?: string
}

export function BrandLogo({ variant = 'full', className }: BrandLogoProps) {
  const size = 'w-auto max-w-full object-contain object-left'
  return (
    <>
      {/* display: none removes the hidden twin from the accessibility tree, so the name is read once. */}
      <img src={ASSETS[variant].light} alt={APP_NAME} decoding="async" className={cn(size, 'dark:hidden', className)} />
      <img src={ASSETS[variant].dark} alt={APP_NAME} decoding="async" className={cn(size, 'hidden dark:block', className)} />
    </>
  )
}
