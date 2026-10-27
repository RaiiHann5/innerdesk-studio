import type { Config } from 'tailwindcss'

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    fontFamily: {
      ui: ['Switzer', '"Hanken Grotesk"', 'sans-serif'],
      display: ['"Cabinet Grotesk"', '"Hanken Grotesk"', 'sans-serif'],
      serif: ['Newsreader', 'Georgia', '"Times New Roman"', 'serif'],
      mono: ['"IBM Plex Mono"', 'ui-monospace', '"SFMono-Regular"', 'Menlo', 'monospace'],
    },
    // The type scale is closed on purpose: 12 / 13 / 14 / 16 / 20 / 28.
    fontSize: {
      xs: ['12px', '16px'],
      sm: ['13px', '18px'],
      base: ['14px', '20px'],
      md: ['16px', '24px'],
      lg: ['20px', '28px'],
      xl: ['28px', '34px'],
    },
    borderRadius: { none: '0', chip: '6px', control: '8px', card: '12px', full: '9999px' },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: token('bg'),
      surface: token('surface'),
      sunken: token('surface-sunken'),
      line: token('line'),
      ink: token('ink'),
      muted: token('muted'),
      faint: token('faint'),
      accent: {
        DEFAULT: token('accent'),
        hover: token('accent-hover'),
        soft: token('accent-soft'),
        text: token('accent-text'),
        on: token('on-accent'),
      },
      mood: {
        1: token('mood-1'),
        2: token('mood-2'),
        3: token('mood-3'),
        4: token('mood-4'),
        5: token('mood-5'),
        'on-low': token('mood-on-low'),
        'on-high': token('mood-on-high'),
      },
      cat: {
        moss: token('cat-moss'),
        ochre: token('cat-ochre'),
        clay: token('cat-clay'),
        teal: token('cat-teal'),
        slate: token('cat-slate'),
        rosewood: token('cat-rosewood'),
      },
      status: {
        todo: token('status-todo'),
        doing: token('status-doing'),
        review: token('status-review'),
        done: token('status-done'),
        overdue: token('status-overdue'),
      },
      companion: {
        belly: token('companion-belly'),
        leaf: token('companion-leaf'),
        dark: token('companion-dark'),
      },
    },
    extend: {
      borderColor: { DEFAULT: token('line') },
      boxShadow: { lift: 'var(--shadow-lift)' },
      transitionDuration: { fast: 'var(--dur-fast)', base: 'var(--dur-base)' },
      keyframes: {
        'page-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
        'pop-in': { from: { opacity: '0', transform: 'scale(.98)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        'page-in': 'page-in var(--dur-base) ease-out',
        'pop-in': 'pop-in var(--dur-fast) ease-out',
        'slide-in': 'slide-in var(--dur-base) ease-out',
        'slide-up': 'slide-up var(--dur-base) ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config
