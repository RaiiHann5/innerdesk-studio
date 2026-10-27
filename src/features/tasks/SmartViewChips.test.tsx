// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SMART_VIEWS, type SmartView } from '@/lib/taskQuery'
import { SmartViewChips } from './SmartViewChips'

afterEach(cleanup)

const counts = Object.fromEntries(SMART_VIEWS.map((v) => [v, 0])) as Record<SmartView, number>

describe('SmartViewChips', () => {
  it('lists the six views, shows a count only when it is above zero', () => {
    render(<SmartViewChips value={null} counts={{ ...counts, overdue: 3 }} onChange={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(6)
    expect(screen.getByRole('button', { name: /Terlambat/ }).textContent).toContain('3')
    expect(screen.getByRole('button', { name: 'Hari ini' }).textContent).toBe('Hari ini')
  })

  it('marks the active view pressed, and a second press turns it off', () => {
    const onChange = vi.fn()
    render(<SmartViewChips value="today" counts={counts} onChange={onChange} />)
    const today = screen.getByRole('button', { name: 'Hari ini' })
    expect(today.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(today)
    expect(onChange).toHaveBeenLastCalledWith(null)
    fireEvent.click(screen.getByRole('button', { name: 'Minggu ini' }))
    expect(onChange).toHaveBeenLastCalledWith('week')
  })
})
