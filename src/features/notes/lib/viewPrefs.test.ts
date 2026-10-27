import { describe, expect, it } from 'vitest'
import { DEFAULT_VIEW_PREFS, docStyle, type ViewPrefs } from './viewPrefs'

const vars = (prefs: ViewPrefs) => docStyle(prefs) as Record<string, string>

describe('docStyle', () => {
  it('maps the defaults to Switzer, 16px and a 1.75 line height', () => {
    const style = vars(DEFAULT_VIEW_PREFS)
    expect(style['--doc-font']).toContain('Switzer')
    expect(style['--doc-size']).toBe('16px')
    expect(style['--doc-leading']).toBe('1.75')
  })

  it('maps each font, size and spacing step', () => {
    expect(vars({ font: 'serif', size: 18, spacing: 'longgar' })).toMatchObject({ '--doc-size': '18px', '--doc-leading': '2' })
    expect(vars({ font: 'serif', size: 14, spacing: 'rapat' })['--doc-font']).toContain('Newsreader')
    expect(vars({ font: 'mono', size: 14, spacing: 'rapat' })).toMatchObject({ '--doc-size': '14px', '--doc-leading': '1.5' })
    expect(vars({ font: 'mono', size: 16, spacing: 'normal' })['--doc-font']).toContain('IBM Plex Mono')
  })

  it('falls back to the defaults for values it does not know', () => {
    const style = vars({ font: 'comic' as never, size: 99 as never, spacing: 'x' as never })
    expect(style).toEqual(vars(DEFAULT_VIEW_PREFS))
  })
})
