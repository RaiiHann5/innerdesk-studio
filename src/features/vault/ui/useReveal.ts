import { useCallback, useEffect, useState } from 'react'
import { useVaultPrefs } from '../store/vaultPrefs'
import { useCountdown } from './useCountdown'

export const REVEAL_MS = 10_000

/**
 * A secret is shown only after the person asks, and hides itself after 10 seconds, when the tab is hidden,
 * when the window loses focus (if that preference is on), or when the component goes away (including when the vault locks). While hidden the value is not in the DOM.
 */
export function useReveal(durationMs = REVEAL_MS) {
  const [until, setUntil] = useState<number | null>(null)
  const secondsLeft = useCountdown(until)
  const revealed = until !== null

  useEffect(() => {
    if (until === null) return
    const timer = window.setTimeout(() => setUntil(null), Math.max(0, until - Date.now()))
    const onVisibility = () => document.visibilityState === 'hidden' && setUntil(null)
    const onBlur = () => useVaultPrefs.getState().blurOnBlur && setUntil(null)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
    }
  }, [until])

  const toggle = useCallback(() => setUntil((current) => (current === null ? Date.now() + durationMs : null)), [durationMs])
  const hide = useCallback(() => setUntil(null), [])
  return { revealed, secondsLeft, toggle, hide }
}
