import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * The companion's details sit on two surfaces, the orange body and the off-white belly, in both
 * themes. Reading the real tokens means a palette change that makes the face unreadable fails here.
 */

const css = readFileSync(new URL('../../../styles/tokens.css', import.meta.url), 'utf8')

const block = (selector: string) => {
  const start = css.indexOf(selector)
  return css.slice(start, css.indexOf('}', start))
}

const token = (scope: string, name: string): [number, number, number] => {
  const match = new RegExp(`--${name}:\\s*(\\d+) (\\d+) (\\d+)`).exec(scope)
  if (!match) throw new Error(`--${name} not found`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

const channel = (v: number) => {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const luminance = ([r, g, b]: [number, number, number]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
const contrast = (a: [number, number, number], b: [number, number, number]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe.each([
  ['light', ':root {'],
  ['dark', "[data-theme='dark'] {"],
])('companion colours, %s theme', (_name, selector) => {
  const root = block(':root {')
  const scope = block(selector)
  // The dark theme only overrides what changes, so anything it leaves out comes from :root.
  const read = (name: string) => token(scope.includes(`--${name}:`) ? scope : root, name)

  it('keeps the eyes and mouth readable on the body and on the belly', () => {
    const dark = read('companion-dark')
    expect(contrast(dark, read('accent'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(dark, read('companion-belly'))).toBeGreaterThanOrEqual(7)
  })

  it('keeps the belly distinct from the body', () => {
    expect(contrast(read('companion-belly'), read('accent'))).toBeGreaterThanOrEqual(2)
  })
})
