import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../../..')
const VAULT = path.join(ROOT, 'src/features/vault')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const sources = walk(VAULT)
  .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
  .map((file) => ({ file: path.relative(VAULT, file).replaceAll('\\', '/'), text: readFileSync(file, 'utf8') }))
const ui = sources.filter(({ file }) => file.endsWith('.tsx'))

describe('colour contrast (WCAG AA) in both themes', () => {
  const css = readFileSync(path.join(ROOT, 'src/styles/tokens.css'), 'utf8')
  const vars = (block: string) => Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
  const light = vars(/:root\s*\{([\s\S]*?)\n\}/.exec(css)![1])
  const dark = { ...light, ...vars(/\[data-theme=['"]?dark['"]?\]\s*\{([\s\S]*?)\n\s*\}/.exec(css)![1]) }
  const rgb = (value: string) => value.match(/\d+/g)!.slice(0, 3).map(Number)
  const luminance = ([r, g, b]: number[]) => {
    const channel = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  }
  const ratio = (a: string, b: string) => {
    const [x, y] = [luminance(rgb(a)), luminance(rgb(b))]
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
  }

  for (const [name, theme] of [['light', light], ['dark', dark]] as const) {
    it(`text pairs the vault uses reach 4.5:1 (${name})`, () => {
      for (const fg of ['ink', 'muted', 'accent-text', 'status-overdue']) {
        for (const bg of ['bg', 'surface', 'surface-sunken', 'accent-soft']) {
          expect(ratio(theme[fg], theme[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
        }
      }
      expect(ratio(theme['on-accent'], theme.accent), 'primary button').toBeGreaterThanOrEqual(4.5)
    })

    it(`the focus ring reaches 3:1 on the surfaces (${name})`, () => {
      for (const bg of ['bg', 'surface', 'surface-sunken']) expect(ratio(theme['accent-text'], theme[bg]), bg).toBeGreaterThanOrEqual(3)
    })
  }
})

describe('the design language', () => {
  const scale = new Set([...readFileSync(path.join(ROOT, 'tailwind.config.ts'), 'utf8').match(/fontSize:\s*\{([\s\S]*?)\n\s*\}/)![1].matchAll(/(\w+):\s*\[/g)].map((m) => m[1]))

  it('uses only the closed type scale', () => {
    expect([...scale].sort()).toEqual(['base', 'lg', 'md', 'sm', 'xl', 'xs'])
    const unknown = ui.flatMap(({ file, text }) =>
      [...text.matchAll(/\btext-(\d?[a-z]+|\[[^\]]+\])/g)]
        .map((m) => m[1])
        .filter((size) => /^(\d?xs|sm|base|md|lg|\d?xl|\[)/.test(size) && !scale.has(size))
        .map((size) => `${file}: text-${size}`),
    )
    expect(unknown).toEqual([])
  })

  it('has no shadows, no gradients and no emoji of its own', () => {
    for (const { file, text } of ui) {
      expect(text, file).not.toMatch(/\bshadow-|\bbg-gradient|\bfrom-\w|linear-gradient/)
      expect(text, file).not.toMatch(/\p{Extended_Pictographic}/u)
    }
  })

  it('shows numbers with tabular numerals where they change', () => {
    for (const file of ['ui/StrengthMeter.tsx', 'ui/ItemList.tsx', 'ui/SecretRow.tsx', 'ui/GeneratorPanel.tsx']) {
      expect(ui.find((s) => s.file === file)!.text, file).toContain('tabular-nums')
    }
  })
})

describe('accessible controls', () => {
  it('every IconButton has a label', () => {
    for (const { file, text } of ui) {
      for (const tag of text.matchAll(/<IconButton\b[\s\S]*?\/>/g)) expect(tag[0], `${file}: ${tag[0].slice(0, 60)}`).toMatch(/\blabel=/)
    }
  })

  it('text fields turn off autofill and spellcheck, except checkboxes, ranges, files and radios', () => {
    for (const { file, text } of ui) {
      for (const tag of text.matchAll(/<(input|textarea|select)\b[\s\S]*?\/>/g)) {
        const element = tag[0]
        if (tag[1] === 'select' || /type="(checkbox|range|file|radio)"/.test(element)) continue
        expect(element, `${file}: ${element.slice(0, 70)}`).toMatch(/autoComplete|noAssist/)
      }
    }
  })

  it('a dialog or a status message names itself', () => {
    for (const { file, text } of ui) {
      for (const tag of text.matchAll(/<Dialog\b[\s\S]{0,300}/g)) expect(tag[0], file).toMatch(/\blabel=/)
    }
  })
})
