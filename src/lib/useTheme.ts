import { useEffect } from 'react'
import { useUiStore } from '@/stores/ui'
import { useMediaQuery } from './useMediaQuery'

/** Resolves the stored choice against the OS setting and applies it to <html>. */
export function useTheme() {
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const resolved: 'light' | 'dark' = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#141210' : '#F6F4F1')
  }, [resolved])

  return { theme, resolved, toggle: () => setTheme(resolved === 'dark' ? 'light' : 'dark') }
}
