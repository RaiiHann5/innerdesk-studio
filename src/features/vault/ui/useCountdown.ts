import { useEffect, useState } from 'react'

/** Whole seconds until `until` (a timestamp), ticking once a second. 0 when there is nothing to wait for. */
export function useCountdown(until: number | null): number {
  const read = () => (until === null ? 0 : Math.max(0, Math.ceil((until - Date.now()) / 1000)))
  const [seconds, setSeconds] = useState(read)
  useEffect(() => {
    setSeconds(read())
    if (until === null) return
    const timer = window.setInterval(() => {
      const left = read()
      setSeconds(left)
      if (left === 0) window.clearInterval(timer)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [until])
  return seconds
}
