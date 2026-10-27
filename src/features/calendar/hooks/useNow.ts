import { useEffect, useState } from 'react'

const MINUTE = 60_000

/** The current time, refreshed once a minute on the minute. Only components that read it re-render. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer = 0
    const schedule = () => {
      // A small offset past the boundary so the minute has definitely rolled over.
      timer = window.setTimeout(() => {
        setNow(new Date())
        schedule()
      }, MINUTE - (Date.now() % MINUTE) + 50)
    }
    const refresh = () => document.visibilityState === 'visible' && setNow(new Date())
    schedule()
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  return now
}
