import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useVaultPrefs } from '../store/vaultPrefs'

/** Whether this window has focus. */
export function useWindowFocus(): boolean {
  const [focused, setFocused] = useState(() => document.hasFocus())
  useEffect(() => {
    const on = () => setFocused(true)
    const off = () => setFocused(false)
    window.addEventListener('focus', on)
    window.addEventListener('blur', off)
    return () => {
      window.removeEventListener('focus', on)
      window.removeEventListener('blur', off)
    }
  }, [])
  return focused
}

/**
 * With "samarkan saat jendela tidak aktif" on, blurs its children while the window is not focused and makes them
 * inert. This is a visual courtesy only: the content is still in the page, and it does not stop a screenshot.
 */
export function BlurShield({ children }: { children: ReactNode }) {
  const enabled = useVaultPrefs((s) => s.blurOnBlur)
  const focused = useWindowFocus()
  const hidden = enabled && !focused
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) (ref.current as HTMLDivElement & { inert: boolean }).inert = hidden
  }, [hidden])

  return (
    <div className="relative">
      <div ref={ref} aria-hidden={hidden || undefined} className={cn(hidden && 'select-none blur-md')}>
        {children}
      </div>
      {hidden && (
        <p role="status" className="absolute inset-x-0 top-24 text-center text-sm font-medium">
          Jendela tidak aktif. Isi vault disamarkan.
        </p>
      )}
    </div>
  )
}
