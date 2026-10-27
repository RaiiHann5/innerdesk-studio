import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isoDay } from '@/lib/date'

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/**
 * The day the check-in is editing, kept in `?date=` so other pages can link to it and a reload keeps it.
 * Missing, malformed or future dates fall back to today.
 */
export function useSelectedDate(): [date: string, setDate: (date: string) => void] {
  const [params, setParams] = useSearchParams()
  const today = isoDay(0)
  const raw = params.get('date')
  const date = raw && ISO_DAY.test(raw) && raw <= today ? raw : today

  const setDate = useCallback(
    (next: string) => {
      setParams(next === isoDay(0) ? {} : { date: next }, { replace: true })
    },
    [setParams],
  )
  return [date, setDate]
}
