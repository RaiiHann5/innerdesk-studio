import { describe, expect, it } from 'vitest'

/**
 * The design rule that a tinted event surface must stay readable is easy to state and easy to break
 * when a token changes, so it is checked here rather than by eye.
 */

type Rgb = [number, number, number]

const parse = (value: string): Rgb => {
  const parts = value.trim().split(/\s+/).map(Number)
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) throw new Error(`Not an rgb triple: ${value}`)
  return parts as Rgb
}

/** WCAG relative luminance. */
function luminance([r, g, b]: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Tailwind applies `bg-cat-x/15` as 15% of the colour over whatever is behind it. */
export const over = (top: Rgb, alpha: number, bottom: Rgb): Rgb =>
  top.map((channel, i) => channel * alpha + bottom[i] * (1 - alpha)) as Rgb

const LIGHT = {
  surface: '255 255 255',
  sunken: '239 236 231',
  line: '231 227 221',
  ink: '27 24 21',
  muted: '110 103 95',
  accentText: '176 74 10',
  cats: {
    moss: '96 133 90',
    ochre: '168 124 22',
    clay: '176 98 62',
    teal: '52 130 130',
    slate: '96 116 140',
    rosewood: '156 82 100',
  },
}

const DARK = {
  surface: '28 25 22',
  sunken: '35 31 27',
  line: '46 42 37',
  ink: '243 239 234',
  muted: '163 156 148',
  accentText: '255 153 92',
  cats: {
    moss: '128 168 120',
    ochre: '224 170 70',
    clay: '214 134 98',
    teal: '96 170 168',
    slate: '144 164 188',
    rosewood: '206 128 146',
  },
}

const THEMES = { light: LIGHT, dark: DARK }
const AA_TEXT = 4.5
const AA_LARGE = 3

const describeTheme = (name: keyof typeof THEMES) => {
  const theme = THEMES[name]
  const surface = parse(theme.surface)
  const ink = parse(theme.ink)
  const muted = parse(theme.muted)

  return () => {
    it(`ink on surface reaches AA in ${name}`, () => {
      expect(contrast(ink, surface)).toBeGreaterThanOrEqual(AA_TEXT)
    })

    it(`muted text on surface reaches AA in ${name}`, () => {
      expect(contrast(muted, surface)).toBeGreaterThanOrEqual(AA_TEXT)
    })

    it(`muted text on the sunken surface reaches AA in ${name}`, () => {
      expect(contrast(muted, parse(theme.sunken))).toBeGreaterThanOrEqual(AA_TEXT)
    })

    it(`muted text on a hatched day stays readable in ${name}`, () => {
      // The hatch is hairlines of `line` over the surface, so the worst case is a cell that reads
      // as roughly halfway between the two.
      const hatched = over(parse(theme.line), 0.5, surface)
      expect(contrast(muted, hatched)).toBeGreaterThanOrEqual(AA_TEXT)
      expect(contrast(ink, hatched)).toBeGreaterThanOrEqual(AA_TEXT)
    })

    it(`the orange small-text token reaches AA in ${name}`, () => {
      expect(contrast(parse(theme.accentText), surface)).toBeGreaterThanOrEqual(AA_TEXT)
    })

    for (const [token, value] of Object.entries(theme.cats)) {
      it(`ink on the ${token} tint reaches AA in ${name}`, () => {
        expect(contrast(ink, over(parse(value), 0.15, surface))).toBeGreaterThanOrEqual(AA_TEXT)
      })

      it(`muted text on the ${token} tint reaches AA in ${name}`, () => {
        expect(contrast(muted, over(parse(value), 0.15, surface))).toBeGreaterThanOrEqual(AA_TEXT)
      })

      it(`the ${token} bar reaches the 3:1 mark for a non-text edge in ${name}`, () => {
        expect(contrast(parse(value), surface)).toBeGreaterThanOrEqual(AA_LARGE)
      })
    }
  }
}

describe('light theme contrast', describeTheme('light'))
describe('dark theme contrast', describeTheme('dark'))

/** The five mood steps are solid colours, so the text on each has to be checked against that exact fill. */
const MOOD = {
  light: {
    fills: ['253 233 221', '251 210 187', '249 181 141', '245 143 84', '242 106 27'],
    on: ['27 24 21', '27 24 21', '27 24 21', '27 24 21', '27 24 21'],
  },
  dark: {
    fills: ['62 40 26', '96 54 29', '142 74 34', '198 98 40', '255 122 46'],
    on: ['243 239 234', '243 239 234', '243 239 234', '20 18 16', '20 18 16'],
  },
}

for (const name of ['light', 'dark'] as const) {
  describe(`mood levels in ${name}`, () => {
    MOOD[name].fills.forEach((fill, i) => {
      it(`the label on level ${i + 1} reaches AA`, () => {
        expect(contrast(parse(MOOD[name].on[i]), parse(fill))).toBeGreaterThanOrEqual(AA_TEXT)
      })
    })

    it('each step is told apart from its neighbour by at least 1.15:1', () => {
      const fills = MOOD[name].fills.map(parse)
      for (let i = 1; i < fills.length; i++) expect(contrast(fills[i], fills[i - 1])).toBeGreaterThanOrEqual(1.15)
    })
  })
}

/** The focus ring uses --accent-text. The plain accent is 2.8:1 on the light page background, which is too faint. */
const FOCUS_RING = {
  light: { ring: '176 74 10', behind: ['246 244 241', '255 255 255', '239 236 231', '255 240 229'] },
  dark: { ring: '255 153 92', behind: ['20 18 16', '28 25 22', '35 31 27', '44 28 18'] },
}

for (const name of ['light', 'dark'] as const) {
  describe(`focus ring in ${name}`, () => {
    FOCUS_RING[name].behind.forEach((bg) => {
      it(`reaches 3:1 against ${bg}`, () => {
        expect(contrast(parse(FOCUS_RING[name].ring), parse(bg))).toBeGreaterThanOrEqual(AA_LARGE)
      })
    })
  })
}

/** Pairs the notes screens rely on: breadcrumb and quiet buttons on the page background, active controls on the soft accent. */
const NOTES_PAIRS = {
  light: { bg: '246 244 241', accentSoft: '255 240 229', accentText: '176 74 10', muted: '110 103 95', ink: '27 24 21' },
  dark: { bg: '20 18 16', accentSoft: '44 28 18', accentText: '255 153 92', muted: '163 156 148', ink: '243 239 234' },
}

for (const name of ['light', 'dark'] as const) {
  describe(`notes screens in ${name}`, () => {
    const t = NOTES_PAIRS[name]
    it('muted text (breadcrumb link, save status) reaches AA on the page background', () => {
      expect(contrast(parse(t.muted), parse(t.bg))).toBeGreaterThanOrEqual(AA_TEXT)
    })
    it('ink (current note in the breadcrumb) reaches AA on the page background', () => {
      expect(contrast(parse(t.ink), parse(t.bg))).toBeGreaterThanOrEqual(AA_TEXT)
    })
    it('the accent text on the soft accent (active panel buttons, tabs, selected card) reaches AA', () => {
      expect(contrast(parse(t.accentText), parse(t.accentSoft))).toBeGreaterThanOrEqual(AA_TEXT)
    })
  })
}

/**
 * Pairs the task and project screens rely on: the red overdue text (dates, health, late milestones), muted text
 * on the page and on a hovered or selected row, the pressed smart-view chip, and the checkbox colour.
 */
const WORK_PAIRS = {
  light: {
    bg: '246 244 241',
    surface: '255 255 255',
    sunken: '239 236 231',
    accent: '242 106 27',
    accentText: '176 74 10',
    accentSoft: '255 240 229',
    overdue: '164 36 28',
    muted: '110 103 95',
    ink: '27 24 21',
  },
  dark: {
    bg: '20 18 16',
    surface: '28 25 22',
    sunken: '35 31 27',
    accent: '255 122 46',
    accentText: '255 153 92',
    accentSoft: '44 28 18',
    overdue: '240 112 100',
    muted: '163 156 148',
    ink: '243 239 234',
  },
}

for (const name of ['light', 'dark'] as const) {
  describe(`task and project screens in ${name}`, () => {
    const t = WORK_PAIRS[name]
    const surface = parse(t.surface)
    // Table rows tint to `bg-sunken/60` on hover or selection, and `/50` in headers; /60 is the stronger of the two.
    const selectedRow = over(parse(t.sunken), 0.6, surface)

    it('overdue red text reaches AA on the page, the surface and the sunken surface', () => {
      for (const behind of [t.bg, t.surface, t.sunken]) expect(contrast(parse(t.overdue), parse(behind))).toBeGreaterThanOrEqual(AA_TEXT)
    })

    it('overdue red text reaches AA on a selected or hovered row', () => {
      expect(contrast(parse(t.overdue), selectedRow)).toBeGreaterThanOrEqual(AA_TEXT)
    })

    it('muted and ink text reach AA on a selected or hovered row', () => {
      expect(contrast(parse(t.muted), selectedRow)).toBeGreaterThanOrEqual(AA_TEXT)
      expect(contrast(parse(t.ink), selectedRow)).toBeGreaterThanOrEqual(AA_TEXT)
    })

    it('the pressed smart-view chip (accent text on the soft accent) reaches AA', () => {
      expect(contrast(parse(t.accentText), parse(t.accentSoft))).toBeGreaterThanOrEqual(AA_TEXT)
    })

    it('the accent-text colour used for checkboxes reaches the 3:1 a control state needs, on every surface', () => {
      for (const behind of [t.bg, t.surface, t.sunken]) expect(contrast(parse(t.accentText), parse(behind))).toBeGreaterThanOrEqual(AA_LARGE)
    })

    it('records why checkboxes do not use the plain accent: it misses 3:1 on the light page', () => {
      const plain = contrast(parse(t.accent), parse(t.bg))
      if (name === 'light') expect(plain).toBeLessThan(AA_LARGE)
      else expect(plain).toBeGreaterThanOrEqual(AA_LARGE)
    })
  })
}
