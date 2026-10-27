import { describe, expect, it } from 'vitest'
import { billChips } from './financeCalendar'
import { makeRecurring } from './financeTesting'

describe('billChips', () => {
  const spotify = makeRecurring({ id: 's', name: 'Spotify', nextDate: '2026-10-20', freq: 'monthly', interval: 1 })
  it('lists each occurrence inside the range once, with a stable id', () => {
    const chips = billChips([spotify], '2026-10-01', '2026-12-31')
    expect(chips.map((c) => c.date)).toEqual(['2026-10-20', '2026-11-20', '2026-12-20'])
    expect(new Set(chips.map((c) => c.id)).size).toBe(3)
  })
  it('does not drift on month-end bills and skips inactive ones and dates before the range', () => {
    const rent = makeRecurring({ id: 'k', name: 'Kos', nextDate: '2026-01-31', freq: 'monthly', interval: 1 })
    expect(billChips([rent], '2026-02-01', '2026-03-31').map((c) => c.date)).toEqual(['2026-02-28', '2026-03-31'])
    expect(billChips([{ ...spotify, active: false }], '2026-10-01', '2026-12-31')).toEqual([])
  })
})
