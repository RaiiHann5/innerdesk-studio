import type { CSSProperties } from 'react'

export type DocFont = 'sans' | 'serif' | 'mono'
export type DocSize = 14 | 16 | 18
export type DocSpacing = 'rapat' | 'normal' | 'longgar'

export interface ViewPrefs {
  font: DocFont
  size: DocSize
  spacing: DocSpacing
}

export const DEFAULT_VIEW_PREFS: ViewPrefs = { font: 'sans', size: 16, spacing: 'normal' }

export const FONT_OPTIONS: Array<{ value: DocFont; label: string; stack: string }> = [
  { value: 'sans', label: 'Switzer', stack: "Switzer, 'Hanken Grotesk', sans-serif" },
  { value: 'serif', label: 'Newsreader', stack: "Newsreader, Georgia, 'Times New Roman', serif" },
  { value: 'mono', label: 'Plex Mono', stack: "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace" },
]

export const SIZE_OPTIONS: Array<{ value: DocSize; label: string }> = [
  { value: 14, label: '14' },
  { value: 16, label: '16' },
  { value: 18, label: '18' },
]

export const SPACING_OPTIONS: Array<{ value: DocSpacing; label: string; leading: number }> = [
  { value: 'rapat', label: 'Rapat', leading: 1.5 },
  { value: 'normal', label: 'Normal', leading: 1.75 },
  { value: 'longgar', label: 'Longgar', leading: 2 },
]

/** The option for a stored value, or the default when storage holds something this version does not know. */
function pick<T extends { value: unknown }>(options: T[], value: unknown, fallback: unknown): T {
  return options.find((o) => o.value === value) ?? options.find((o) => o.value === fallback)!
}

/**
 * The CSS variables the paper reads. Preferences are applied through variables, not classes, so a
 * change repaints the document without re-rendering the editor.
 */
export function docStyle({ font, size, spacing }: ViewPrefs): CSSProperties {
  return {
    '--doc-font': pick(FONT_OPTIONS, font, DEFAULT_VIEW_PREFS.font).stack,
    '--doc-size': `${pick(SIZE_OPTIONS, size, DEFAULT_VIEW_PREFS.size).value}px`,
    '--doc-leading': String(pick(SPACING_OPTIONS, spacing, DEFAULT_VIEW_PREFS.spacing).leading),
  } as CSSProperties
}
