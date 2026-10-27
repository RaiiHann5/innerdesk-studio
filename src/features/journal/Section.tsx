import type { ReactNode } from 'react'
import { Check, type Icon } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'

interface SectionProps {
  id: string
  icon: Icon
  title: string
  done: boolean
  /** Right side of the heading, such as a character count. */
  aside?: ReactNode
  children: ReactNode
}

/** One part of the day. The mark beside the title fills in when the part has something in it. */
export function Section({ id, icon: IconComponent, title, done, aside, children }: SectionProps) {
  return (
    <section id={`part-${id}`} aria-labelledby={`part-${id}-title`} className="scroll-mt-20 border-t px-4 py-5 md:px-6">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h3 id={`part-${id}-title`} className="flex items-center gap-2.5 font-ui text-sm font-semibold">
          <span
            aria-hidden
            className={cn('grid size-5 place-items-center rounded-full border transition-colors duration-fast', done ? 'border-ink bg-ink text-bg' : 'border-dashed border-faint text-transparent')}
          >
            <Check size={11} weight="bold" />
          </span>
          <IconComponent size={16} aria-hidden className="text-muted" />
          {title}
          <span className="sr-only">{done ? ', sudah diisi' : ', belum diisi'}</span>
        </h3>
        {aside && <div className="text-xs tabular-nums text-muted">{aside}</div>}
      </header>
      {children}
    </section>
  )
}

export const counts = (text: string, words: number) => `${text.length} karakter · ${words} kata`
