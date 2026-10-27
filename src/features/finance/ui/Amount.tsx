import { cn } from '@/lib/cn'
import { formatMoney, type FormatOptions } from '@/lib/money'
import { spokenMoney } from '@/lib/moneySpeech'
import type { CurrencyCode } from '@/types/domain'
import { usePrivacyStore } from '../store/privacy'

interface AmountProps extends FormatOptions {
  minor: number
  currency?: CurrencyCode
  className?: string
  /** Gives screen readers the spoken form, e.g. "pengeluaran 35 ribu rupiah". Pass the word that goes in front. */
  spoken?: string
}

/** A money amount: tabular figures, never wrapped, blurred while "Sembunyikan nominal" is on. */
export function Amount({ minor, currency = 'IDR', className, spoken, ...format }: AmountProps) {
  const hidden = usePrivacyStore((s) => s.hidden)
  // While hidden, the spoken form is dropped too: the blur must not be a way around the privacy toggle.
  const label = spoken && !hidden ? `${spoken} ${spokenMoney(minor, currency)}` : undefined
  return (
    <span role={label ? 'img' : undefined} aria-label={label} className={cn('whitespace-nowrap tabular-nums', hidden && 'select-none blur-[6px]', className)}>
      {formatMoney(minor, currency, format)}
    </span>
  )
}

/** Wraps anything that carries amounts and is not an <Amount>, such as a chart or a sentence. */
export function PrivacyBlur({ children, className, active = true }: { children: React.ReactNode; className?: string; active?: boolean }) {
  const hidden = usePrivacyStore((s) => s.hidden)
  return <div className={cn(className, hidden && active && 'select-none blur-[6px]')}>{children}</div>
}
