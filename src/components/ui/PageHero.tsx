import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/date'
import { greetingFor } from '@/lib/greeting'
import { useNow } from '@/lib/useNow'
import { useSettingsStore } from '@/stores/settings'
import grain from '@/assets/hero/grain.jpg'
import sunrise from '@/assets/hero/sunrise.jpg'

/**
 * The banner at the top of every page: a gradient photo, the greeting, the page name and a date tile.
 * The art is bright in both themes, so the text on it is a fixed dark ink instead of the theme's ink.
 */
const INK = 'text-[#1B1815]'

// The theme has no `white` colour on purpose, so the frosted layers are written out as rgb values.
const WHITE = { 60: 'bg-[rgb(255_255_255/0.6)]', 70: 'bg-[rgb(255_255_255/0.7)]' } as const

const ART = { sunrise, grain } as const
export type HeroArt = keyof typeof ART

/** The banner is a thin strip of a tall picture; this picks which horizontal band of it shows. */
const BAND = { top: 'object-[50%_8%]', mid: 'object-[50%_50%]', bottom: 'object-[50%_92%]' } as const
export type HeroBand = keyof typeof BAND

interface PageHeroProps {
  title: string
  description?: string
  art: HeroArt
  /** Which band of the picture shows. Defaults to the middle. */
  band?: HeroBand
  /** Mirrors the picture, so two pages using the same one do not look identical. */
  flip?: boolean
  /** Buttons or links under the description. Style them with `HeroButton` or `heroButtonClass`. */
  actions?: ReactNode
  /** Replaces the greeting line above the title. */
  eyebrow?: string
  className?: string
}

function DateTile() {
  const now = useNow(60_000)
  return (
    <time dateTime={fmt(now, 'yyyy-MM-dd')} className={cn('hidden shrink-0 rounded-card px-5 py-3 text-center backdrop-blur-sm sm:block', WHITE[60])}>
      <span className="block font-display text-xl font-bold tabular-nums leading-8">{fmt(now, 'd')}</span>
      <span className="block text-xs font-medium">{fmt(now, 'EEEE')}</span>
      <span className="block text-xs text-[#1B1815]/80">{fmt(now, 'MMMM yyyy')}</span>
    </time>
  )
}

export function PageHero({ title, description, art, band = 'mid', flip, actions, eyebrow, className }: PageHeroProps) {
  const userName = useSettingsStore((s) => s.userName)
  const now = useNow(60_000)

  return (
    <header className={cn('relative isolate shrink-0 overflow-hidden rounded-card border', INK, className)}>
      <img src={ART[art]} alt="" aria-hidden decoding="async" className={cn('absolute inset-0 -z-20 size-full object-cover', BAND[band], flip && '-scale-x-100')} />
      {/* A light wash behind the words only, so the text stays readable on the saturated parts of the picture. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-[rgb(255_255_255/0.4)] via-[rgb(255_255_255/0.15)] to-transparent" />
      <div className="flex min-h-36 items-end justify-between gap-6 p-5 md:min-h-44 md:p-7">
        <div className="min-w-0 max-w-2xl">
          <p className="text-sm font-medium text-[#1B1815]/80">{eyebrow ?? `${greetingFor(now.getHours())}, ${userName}`}</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight">{title}</h1>
          {description && <p className="mt-1.5 text-sm text-[#1B1815]/80">{description}</p>}
          {actions && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        <DateTile />
      </div>
    </header>
  )
}

const base = 'inline-flex h-8 items-center justify-center gap-2 rounded-control px-3 text-sm font-medium transition-colors duration-fast disabled:pointer-events-none disabled:opacity-50'
export const heroButtonClass = {
  primary: cn(base, 'bg-[#1B1815] text-[#FFFFFF] hover:bg-[#1B1815]/85'),
  secondary: cn(base, WHITE[70], 'text-[#1B1815] hover:bg-[rgb(255_255_255/0.9)]'),
}

interface HeroButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof heroButtonClass
}

/** A button that reads on the banner: dark fill for the main action, frosted white for the rest. */
export const HeroButton = forwardRef<HTMLButtonElement, HeroButtonProps>(function HeroButton({ variant = 'secondary', className, type = 'button', ...props }, ref) {
  return <button ref={ref} type={type} className={cn(heroButtonClass[variant], className)} {...props} />
})
