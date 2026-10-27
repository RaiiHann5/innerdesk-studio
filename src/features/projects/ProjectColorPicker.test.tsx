// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PROJECT_COLORS, ProjectColorPicker } from './ProjectColorPicker'

afterEach(cleanup)

describe('ProjectColorPicker', () => {
  it('offers the six project colours, each named, with exactly one chosen', () => {
    render(<ProjectColorPicker value="teal" onChange={() => {}} />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(6)
    expect(PROJECT_COLORS.map((c) => c.label)).toEqual(['Lumut', 'Oker', 'Tanah liat', 'Teal', 'Batu tulis', 'Kayu mawar'])
    expect(radios.filter((r) => r.getAttribute('aria-checked') === 'true').map((r) => r.getAttribute('aria-label'))).toEqual(['Teal'])
  })

  it('reports the colour that is pressed', () => {
    const onChange = vi.fn()
    render(<ProjectColorPicker value="teal" onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Kayu mawar' }))
    expect(onChange).toHaveBeenCalledWith('rosewood')
  })

  it('has one tab stop, and the arrow keys move the choice and wrap around', () => {
    const onChange = vi.fn()
    render(<ProjectColorPicker value="rosewood" onChange={onChange} />)
    const stops = screen.getAllByRole('radio').filter((r) => r.tabIndex === 0)
    expect(stops.map((r) => r.getAttribute('aria-label'))).toEqual(['Kayu mawar'])
    fireEvent.keyDown(stops[0], { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('moss')
    fireEvent.keyDown(stops[0], { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('slate')
    fireEvent.keyDown(stops[0], { key: 'a' })
    expect(onChange).toHaveBeenCalledTimes(2)
  })
})
