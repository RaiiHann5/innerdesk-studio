import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isoDay } from '@/lib/date'

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

interface JournalDate {
  /** The day being written, from `?date=`. Missing, malformed or future dates mean today. */
  date: string
  /** True when the URL names a day. On a phone this is what switches from the date list to the editor. */
  explicit: boolean
  select: (date: string, options?: { replace?: boolean }) => void
  /** Back to the date list (no `?date=`). */
  clear: () => void
}

export function useJournalDate(): JournalDate {
  const [params, setParams] = useSearchParams()
  const today = isoDay(0)
  const raw = params.get('date')
  const valid = raw !== null && ISO_DAY.test(raw) && raw <= today
  return {
    date: valid ? raw : today,
    explicit: valid,
    select: useCallback((next, options) => setParams({ date: next }, { replace: options?.replace ?? false }), [setParams]),
    clear: useCallback(() => setParams({}), [setParams]),
  }
}
